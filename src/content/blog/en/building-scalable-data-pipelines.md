---
title: "Building Scalable Data Pipelines: Event-Driven Architecture and the Modern Data Stack"
date: "2026-03-22"
author: "HyperCubeSphere Engineering"
tags: ["data engineering", "kafka", "flink", "stream processing", "data pipelines"]
excerpt: "Batch processing is dying. Event-driven, streaming-first architectures are the engineering standard for any organization that needs data to inform decisions in seconds, not hours. Here's how to build them."
---

The gap between when something happens and when your organization knows about it is costing you more than you think. Batch pipelines that run at midnight produce stale data that drives yesterday's decisions. In fraud detection, that's a financial loss. In operational intelligence, that's an outage you didn't prevent. In customer experience, that's a churn signal you acted on too late.

This post is a practical deep dive into event-driven data architecture: when to stream, when to batch, how to build Kafka pipelines that actually survive production, how to run Flink at scale, and how to build the observability layer that keeps all of it honest.

---

## Batch vs. Stream vs. Hybrid: Choosing the Right Pattern

The decision between batch and stream processing is not a religious one. It's an engineering tradeoff driven by latency requirements, data characteristics, and operational complexity budgets.

### When Batch Is Still the Right Answer

Batch processing is simpler to build, simpler to debug, and simpler to reprocess. For use cases where freshness requirements are measured in hours or days, batch is often the correct choice:

- **Historical analytics and reporting** — Monthly financial reports, quarterly business reviews, compliance reports. Data is inherently point-in-time. Batch ETL into a warehouse is appropriate.
- **Model training** — Most ML training pipelines are batch by nature. Training on streaming data requires specialized infrastructure (online learning, incremental training) that adds significant complexity with limited benefit unless the model requires sub-hour freshness.
- **Heavy transformations** — Complex joins across large datasets (billions of rows) are often more efficiently handled by MPP query engines (BigQuery, Snowflake, Redshift) than stream processors, especially if the join keys are not cleanly ordered.

### When Streaming Is Required

Stream processing is the right pattern when:

- **Latency requirements are sub-minute** — Fraud scoring, real-time personalization, operational alerting, live dashboards. Batch pipelines cannot meet these SLAs.
- **Data arrives continuously and must be acted upon** — IoT telemetry, clickstream, financial ticks, application events. Buffering this data for batch processing means you're discarding the temporal relationships between events that contain the most signal.
- **Event-driven microservices** — Services that react to events (order placed → trigger fulfillment → notify warehouse) are architecturally streaming. Treating these as batch processes introduces latency and coupling.

### The Hybrid (Lambda/Kappa) Architecture

Many production systems need both. The Lambda architecture (popularized by Nathan Marz) runs a stream layer for real-time results and a batch layer for accurate historical recomputation, serving queries from a merged view. The Kappa architecture simplifies this by using only the stream layer, with the ability to reprocess from immutable event logs.

**The Kappa pattern has largely won** in modern stacks. The reason: maintaining two separate processing codebases (batch and stream) that must produce equivalent results is operationally brutal. Kafka's infinite retention (via tiered storage) plus a stream processor like Flink can handle both real-time processing and historical reprocessing from the same codebase.

---

## Kafka Architecture: The Foundation

Apache Kafka is the de facto standard for event streaming infrastructure at enterprise scale. Understanding the internals is essential for building reliable pipelines.

### Core Concepts

- **Topics** are append-only, ordered, immutable logs. Events are never updated in place; new events are always appended. This is the fundamental design choice that makes Kafka reliable and scalable.
- **Partitions** are the unit of parallelism. A topic with 12 partitions can be consumed by up to 12 consumers in parallel within a consumer group. Partition count is a capacity planning decision you make at topic creation — over-partitioning has costs (more file handles, more replication overhead), under-partitioning limits throughput.
- **Consumer groups** allow multiple independent applications to consume the same topic. Kafka tracks each consumer group's offset independently. Your fraud detection system and your analytics pipeline can both consume the same payments topic without interfering.
- **Replication** provides fault tolerance. A replication factor of 3 means every message is written to 3 brokers. `min.insync.replicas=2` ensures a write is only acknowledged after 2 replicas confirm it — the durability/latency tradeoff to tune.

### Producer: Writing Events Reliably

```python
from confluent_kafka import Producer, KafkaException
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer
from confluent_kafka.serialization import SerializationContext, MessageField
import json
import logging

logger = logging.getLogger(__name__)

PRODUCER_CONFIG = {
    "bootstrap.servers": "kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092",
    # Exactly-once semantics
    "enable.idempotence": True,
    "acks": "all",
    "retries": 10,
    "max.in.flight.requests.per.connection": 5,
    # Performance tuning
    "compression.type": "lz4",
    "batch.size": 65536,          # 64KB batches
    "linger.ms": 5,               # Wait up to 5ms to fill a batch
    "buffer.memory": 67108864,    # 64MB buffer
}

PAYMENT_EVENT_SCHEMA = """
{
  "type": "record",
  "name": "PaymentEvent",
  "namespace": "com.hypercubesphere.payments",
  "fields": [
    {"name": "event_id",      "type": "string"},
    {"name": "event_type",    "type": "string"},
    {"name": "account_id",   "type": "string"},
    {"name": "amount_cents",  "type": "long"},
    {"name": "currency",      "type": "string"},
    {"name": "timestamp_ms",  "type": "long"},
    {"name": "metadata",      "type": {"type": "map", "values": "string"}}
  ]
}
"""

def delivery_callback(err, msg):
    if err:
        logger.error(f"Delivery failed for topic={msg.topic()} partition={msg.partition()}: {err}")
        # Emit to dead-letter queue or alerting system
        raise KafkaException(err)
    else:
        logger.debug(f"Delivered to {msg.topic()}[{msg.partition()}] offset={msg.offset()}")

class PaymentEventProducer:
    def __init__(self, schema_registry_url: str):
        schema_registry_client = SchemaRegistryClient({"url": schema_registry_url})
        self.avro_serializer = AvroSerializer(
            schema_registry_client,
            PAYMENT_EVENT_SCHEMA
        )
        self.producer = Producer(PRODUCER_CONFIG)

    def publish(self, account_id: str, event: dict) -> None:
        """Publish a payment event. account_id is the partition key — ensures
        all events for an account land on the same partition, preserving order."""
        self.producer.produce(
            topic="payments.events.v2",
            key=account_id.encode("utf-8"),
            value=self.avro_serializer(
                event,
                SerializationContext("payments.events.v2", MessageField.VALUE)
            ),
            on_delivery=delivery_callback
        )
        # poll() drives delivery callbacks — call frequently
        self.producer.poll(0)

    def flush(self, timeout: float = 30.0) -> None:
        remaining = self.producer.flush(timeout)
        if remaining > 0:
            logger.warning(f"{remaining} messages not delivered within timeout")
```

### Consumer: At-Least-Once Processing with Idempotency

```python
from confluent_kafka import Consumer, KafkaError
from typing import Callable

CONSUMER_CONFIG = {
    "bootstrap.servers": "kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092",
    "group.id": "fraud-detection-service-v2",
    "auto.offset.reset": "earliest",
    # Manual commit for at-least-once semantics
    "enable.auto.commit": False,
    # Session management
    "session.timeout.ms": 30000,
    "heartbeat.interval.ms": 3000,
    "max.poll.interval.ms": 300000,
}

def consume_with_at_least_once(
    topic: str,
    process_fn: Callable,
    batch_size: int = 100
) -> None:
    consumer = Consumer(CONSUMER_CONFIG)
    consumer.subscribe([topic])

    try:
        while True:
            messages = consumer.consume(num_messages=batch_size, timeout=1.0)
            if not messages:
                continue

            for msg in messages:
                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        continue
                    raise KafkaException(msg.error())

                # process_fn MUST be idempotent — we may re-process on failure
                process_fn(msg.key(), msg.value(), msg.offset())

            # Commit only after the entire batch is successfully processed
            consumer.commit(asynchronous=False)

    except KeyboardInterrupt:
        pass
    finally:
        consumer.close()
```

The critical design constraint here: **your processing function must be idempotent.** At-least-once delivery means you will occasionally process the same message twice — on consumer restart, rebalance, or after a commit failure. Use the event's natural idempotency key (usually `event_id`) and check-then-insert patterns in your state store.

---

## Apache Flink: Stream Processing at Scale

Kafka handles event transport. Flink handles stateful computation on those event streams: windowed aggregations, enrichment joins, CEP (Complex Event Processing), and exactly-once stateful transformations.

### A Flink Job Skeleton: Fraud Signal Aggregation

```java
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.AggregateFunction;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.windowing.assigners.SlidingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;

import java.time.Duration;

public class FraudSignalAggregationJob {

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        // Checkpoint every 30s for exactly-once state
        env.enableCheckpointing(30_000);
        env.getCheckpointConfig().setCheckpointStorage("s3://company-flink-checkpoints/fraud-signals/");

        // Kafka source with Avro deserialization
        KafkaSource<PaymentEvent> source = KafkaSource.<PaymentEvent>builder()
            .setBootstrapServers("kafka-broker-1:9092,kafka-broker-2:9092")
            .setTopics("payments.events.v2")
            .setGroupId("flink-fraud-signal-aggregator")
            .setStartingOffsets(OffsetsInitializer.committedOffsets())
            .setValueOnlyDeserializer(new PaymentEventAvroDeserializer())
            .build();

        // Watermark strategy: allow up to 5s of late events
        WatermarkStrategy<PaymentEvent> watermarkStrategy = WatermarkStrategy
            .<PaymentEvent>forBoundedOutOfOrderness(Duration.ofSeconds(5))
            .withTimestampAssigner((event, ts) -> event.getTimestampMs());

        DataStream<PaymentEvent> payments = env
            .fromSource(source, watermarkStrategy, "Kafka Payment Events");

        // Sliding window: transaction velocity per account over last 5 minutes,
        // evaluated every 60 seconds
        DataStream<AccountRiskSignal> riskSignals = payments
            .keyBy(PaymentEvent::getAccountId)
            .window(SlidingEventTimeWindows.of(Time.minutes(5), Time.seconds(60)))
            .aggregate(new TransactionVelocityAggregator())
            .filter(signal -> signal.getRiskScore() > 0.6)
            .name("Transaction Velocity Risk Signals");

        // Write high-risk signals to Kafka for real-time decisioning
        riskSignals.sinkTo(buildKafkaSink("fraud.risk-signals.v1"));

        // Write all signals to Iceberg for historical analysis
        riskSignals.sinkTo(buildIcebergSink("fraud_analytics.risk_signals"));

        env.execute("Fraud Signal Aggregation Job");
    }

    // Aggregation: count transactions, sum amounts, compute velocity score
    static class TransactionVelocityAggregator
        implements AggregateFunction<PaymentEvent, VelocityAccumulator, AccountRiskSignal> {

        @Override
        public VelocityAccumulator createAccumulator() {
            return new VelocityAccumulator();
        }

        @Override
        public VelocityAccumulator add(PaymentEvent event, VelocityAccumulator acc) {
            acc.count++;
            acc.totalAmountCents += event.getAmountCents();
            acc.accountId = event.getAccountId();
            acc.windowEnd = event.getTimestampMs();
            return acc;
        }

        @Override
        public AccountRiskSignal getResult(VelocityAccumulator acc) {
            // Simplified velocity scoring — real implementation uses
            // per-account baselines from a feature store
            double velocityScore = Math.min(1.0, acc.count / 20.0);
            double amountScore = Math.min(1.0, acc.totalAmountCents / 500_000.0);
            double riskScore = 0.6 * velocityScore + 0.4 * amountScore;

            return new AccountRiskSignal(acc.accountId, acc.count,
                acc.totalAmountCents, riskScore, acc.windowEnd);
        }

        @Override
        public VelocityAccumulator merge(VelocityAccumulator a, VelocityAccumulator b) {
            a.count += b.count;
            a.totalAmountCents += b.totalAmountCents;
            return a;
        }
    }
}
```

### Flink Operational Considerations

**Checkpointing is everything.** Flink's exactly-once guarantees depend on consistent checkpoints to durable storage (S3, GCS, HDFS). If checkpointing fails consistently, your job is running at-least-once or worse. Monitor checkpoint duration and failures as first-class SLIs.

**State backend selection:**
- `HashMapStateBackend` (in-heap) — fast, but state is lost on task manager failure and limits state size to heap size. Acceptable for stateless or low-state jobs.
- `EmbeddedRocksDBStateBackend` — state on local disk + checkpointed to remote storage. Required for large state (joins against lookup tables, long-window aggregations). Higher latency than in-heap but necessary for production workloads.

**Watermark tuning:** Your watermark strategy determines how long Flink waits for late events before closing a window. Too aggressive (short delay) and you drop late events. Too conservative (long delay) and you increase end-to-end latency. Profile your event time distribution and set the delay at the 99th percentile of event lag, not the maximum.

---

## Schema Evolution: Avoiding Pipeline Breakage

Schemas change. The service that produces `payments.events.v2` will eventually need to add a field, rename a field, or change a type. Without a schema management strategy, schema changes break downstream consumers in production.

**Confluent Schema Registry** is the standard solution for Avro, Protobuf, and JSON Schema. Every schema version is registered and validated against a compatibility mode:

- **Backward compatibility** — New schema can read data written by old schema. New consumers can read old messages. Safe for adding optional fields.
- **Forward compatibility** — Old schema can read data written by new schema. Old consumers can read new messages. Safe for removing optional fields.
- **Full compatibility** — Both backward and forward. Most restrictive but safest for long-running consumer groups.

The operational rule: **enforce `FULL_TRANSITIVE` compatibility in production.** Any schema change that would break either old producers or old consumers must go through a multi-step migration:

1. Add the new field as optional with a default value (backward compatible)
2. Deploy all consumers to handle the new field
3. Deploy producers to populate the new field
4. Mark the old field as deprecated
5. After all consumers are updated, remove the old field in a subsequent release

Never remove a required field, rename a field, or change a field type in a single deployment.

---

## Change Data Capture (CDC): Streaming from Databases

Many event-driven architectures need to stream changes from existing relational databases into Kafka without modifying application code. Change Data Capture reads the database's transaction log and publishes row-level changes as events.

**Debezium** is the standard open-source CDC platform. It supports PostgreSQL (logical replication), MySQL (binlog), Oracle (LogMiner), and SQL Server (CDC). A Debezium connector deployed in Kafka Connect reads the transaction log and publishes `INSERT`, `UPDATE`, and `DELETE` events to Kafka topics.

Key operational considerations for Debezium CDC:
- Enable `REPLICA IDENTITY FULL` on PostgreSQL tables you want full before/after row images on updates (default only includes the primary key in the before image)
- Replication slots accumulate WAL if the connector falls behind — monitor slot lag aggressively; unchecked growth can fill disk and crash PostgreSQL
- Initial snapshot of large tables can take hours and generate significant database load — schedule during low-traffic periods

---

## Data Lakehouse and dbt Transformations

The modern data stack converges on the **lakehouse pattern**: open table formats (Apache Iceberg, Delta Lake) on object storage provide ACID transactions, time travel, and schema evolution on the storage layer, served by query engines (Trino, Spark, Snowflake) and a compute layer.

Stream processing outputs land directly into Iceberg tables. dbt runs transformation models on top for analytical use cases:

```sql
-- dbt model: marts/fraud/daily_account_risk_summary.sql
-- Incremental model: only processes new risk signals
{{
  config(
    materialized='incremental',
    unique_key='account_id || date_trunc(\'day\', window_end_at)',
    incremental_strategy='merge',
    partition_by={'field': 'risk_date', 'data_type': 'date'}
  )
}}

WITH risk_signals AS (
  SELECT
    account_id,
    DATE_TRUNC('day', window_end_at)       AS risk_date,
    MAX(risk_score)                         AS peak_risk_score,
    AVG(risk_score)                         AS avg_risk_score,
    SUM(transaction_count)                  AS total_transactions,
    SUM(total_amount_cents) / 100.0         AS total_amount_usd,
    COUNT(*)                                AS signal_count
  FROM {{ source('fraud_analytics', 'risk_signals') }}
  WHERE risk_score > 0.4
  {% if is_incremental() %}
    AND window_end_at > (SELECT MAX(window_end_at) FROM {{ this }})
  {% endif %}
  GROUP BY 1, 2
)

SELECT
  rs.*,
  am.account_tier,
  am.account_created_at,
  CASE
    WHEN rs.peak_risk_score >= 0.9 THEN 'CRITICAL'
    WHEN rs.peak_risk_score >= 0.7 THEN 'HIGH'
    WHEN rs.peak_risk_score >= 0.5 THEN 'MEDIUM'
    ELSE 'LOW'
  END AS risk_tier
FROM risk_signals rs
LEFT JOIN {{ ref('dim_accounts') }} am USING (account_id)
```

---

## Pipeline Observability: The Non-Negotiable Layer

A data pipeline without observability is a liability. You won't know it's broken until someone complains about stale dashboards or missed SLAs. The observability layer for data pipelines covers four dimensions:

**Freshness:** Is data arriving on time? Define SLOs per topic (e.g., payments topic should have events within the last 60 seconds). Alert when the latest event timestamp exceeds the SLO threshold.

**Volume:** Is data volume within expected bounds? Sudden drops indicate upstream failures or outages. Sudden spikes indicate data quality issues or incidents upstream. Use statistical process control (moving average + standard deviation bands) rather than static thresholds for volume alerts.

**Schema:** Are events conforming to the registered schema? Track schema validation failure rates per topic. A spike in schema failures means a producer deployed a breaking change.

**End-to-end latency:** How long does it take from event creation to availability in the serving layer? Instrument with event creation timestamp embedded in the event, and measure at each stage of the pipeline. P50/P95/P99 latency per pipeline stage.

Tooling: **OpenTelemetry** for instrumentation, **Prometheus + Grafana** for metrics, **Apache Atlas** or **OpenMetadata** for data lineage. Great Expectations or Soda for data quality assertions embedded in the pipeline.

---

## Cost Optimization

Streaming infrastructure is expensive if left unchecked. The largest cost levers:

- **Kafka retention:** Don't retain data in Kafka longer than required for consumer group recovery (72 hours is usually sufficient). Use Kafka tiered storage to move older segments to object storage at dramatically lower cost if long retention is required for replay.
- **Flink parallelism:** Over-provisioned Flink task managers are a common waste. Use Flink's autoscaling (Kubernetes HPA on custom metrics, or managed autoscaling in Flink on Kubernetes operator) to scale parallelism based on Kafka consumer group lag.
- **Compute-storage separation:** Store all persistent state in object storage (Iceberg on S3), not in compute nodes. Compute clusters can scale to zero between jobs. This is the foundational cost advantage of the lakehouse pattern over Hadoop-era architectures.
- **Tiered processing:** Not all events need sub-second latency. Route high-priority event types through the real-time Flink pipeline; route lower-priority events to a micro-batch job (every 5 minutes). The cost difference is significant.

> The organizations that build streaming infrastructure well share one trait: they instrument first and optimize continuously. They don't design for cost — they design for correctness and observability, then use the observability data to make informed cost decisions. Premature cost optimization in data infrastructure is how you end up with unmaintainable pipelines that no one trusts.

The modern data pipeline is not a sequence of scripts. It's a distributed system with the same operational requirements as any production service: SLOs, runbooks, on-call rotations, and incident post-mortems. The teams that treat it this way build infrastructure that compounds in value over years. The teams that don't are perpetually firefighting.
