---
title: "Schaalbare Datapipelines Bouwen: Event-Driven Architectuur en de Moderne Datastack"
date: "2026-03-22"
author: "HyperCubeSphere Engineering"
tags: ["data-engineering", "kafka", "flink", "streamverwerking", "datapipelines"]
excerpt: "Batchverwerking sterft uit. Event-driven, streaming-first architecturen zijn de engineeringstandaard voor elke organisatie die data nodig heeft om beslissingen te informeren in seconden, niet in uren. Hier leest u hoe u ze bouwt."
---

Het gat tussen wanneer iets gebeurt en wanneer uw organisatie ervan weet, kost u meer dan u denkt. Batchpipelines die 's nachts om middernacht draaien, produceren verouderde gegevens die beslissingen van gisteren sturen. Bij fraudedetectie is dat een financieel verlies. Bij operationele intelligentie is dat een storing die u niet hebt voorkomen. Bij klantervaring is dat een churnsignaal waarop u te laat hebt gereageerd.

Dit artikel is een praktische diepgaande verkenning van event-driven data-architectuur: wanneer te streamen, wanneer te batchen, hoe Kafka-pipelines te bouwen die de productie daadwerkelijk overleven, hoe Flink op schaal te draaien en hoe de observeerbaarheidslaag te bouwen die alles eerlijk houdt.

---

## Batch vs. Stream vs. Hybride: Het Juiste Patroon Kiezen

De beslissing tussen batch- en streamverwerking is geen religieuze kwestie. Het is een engineeringafweging gedreven door latentievereisten, gegevenskenmerken en budgetten voor operationele complexiteit.

### Wanneer Batch Nog Steeds het Juiste Antwoord Is

Batchverwerking is eenvoudiger te bouwen, eenvoudiger te debuggen en eenvoudiger opnieuw te verwerken. Voor gebruik gevallen waarbij versheidesvereisten in uren of dagen worden gemeten, is batch vaak de juiste keuze:

- **Historische analyse en rapportage** — Maandelijkse financiële rapporten, kwartaalbedrijfsreviews, nalevingsrapporten. Gegevens zijn van nature point-in-time. Batch-ETL naar een warehouse is passend.
- **Modeltraining** — De meeste ML-trainingspipelines zijn van nature batch. Trainen op streaminggegevens vereist gespecialiseerde infrastructuur (online leren, incrementeel trainen) die aanzienlijke complexiteit toevoegt met beperkt voordeel tenzij het model versheid onder een uur vereist.
- **Zware transformaties** — Complexe joins over grote datasets (miljarden rijen) worden vaak efficiënter verwerkt door MPP-query-engines (BigQuery, Snowflake, Redshift) dan streamprocessors, vooral als de joinsleutels niet netjes geordend zijn.

### Wanneer Streaming Vereist Is

Streamverwerking is het juiste patroon wanneer:

- **Latentievereisten sub-minuut zijn** — Fraudescoring, realtime personalisatie, operationele alertering, live dashboards. Batchpipelines kunnen aan deze SLA's niet voldoen.
- **Gegevens continu binnenkomen en er op gehandeld moet worden** — IoT-telemetrie, clickstream, financiële ticks, applicatiegebeurtenissen. Het bufferen van deze gegevens voor batchverwerking betekent dat u de tijdelijke relaties tussen gebeurtenissen weggooit die het meeste signaal bevatten.
- **Event-driven microservices** — Diensten die reageren op gebeurtenissen (bestelling geplaatst → fulfillment starten → magazijn informeren) zijn architectureel streaming. Ze als batchprocessen behandelen introduceert latentie en koppeling.

### De Hybride (Lambda/Kappa) Architectuur

Veel productiesystemen hebben beide nodig. De Lambda-architectuur (gepopulariseerd door Nathan Marz) draait een streaminglaag voor realtime resultaten en een batchlaag voor nauwkeurige historische herberekening, waarbij queries worden bediend vanuit een samengevoegde weergave. De Kappa-architectuur vereenvoudigt dit door alleen de streaminglaag te gebruiken, met de mogelijkheid om opnieuw te verwerken vanuit onveranderlijke gebeurtenislogboeken.

**Het Kappa-patroon heeft grotendeels gewonnen** in moderne stacks. De reden: het onderhouden van twee afzonderlijke verwerkingscodebasen (batch en stream) die equivalente resultaten moeten produceren, is operationeel brutaal zwaar. De oneindige retentie van Kafka (via tiered storage) plus een streamprocessor zoals Flink kan zowel realtime verwerking als historische herverwerking vanuit dezelfde codebase verwerken.

---

## Kafka Architectuur: De Basis

Apache Kafka is de de facto standaard voor event-streaminginfrastructuur op enterprise-schaal. Het begrijpen van de interne werking is essentieel voor het bouwen van betrouwbare pipelines.

### Kernconcepten

- **Topics** zijn append-only, geordende, onveranderlijke logboeken. Gebeurtenissen worden nooit ter plaatse bijgewerkt; nieuwe gebeurtenissen worden altijd toegevoegd. Dit is de fundamentele ontwerpkeuze die Kafka betrouwbaar en schaalbaar maakt.
- **Partities** zijn de eenheid van parallellisme. Een topic met 12 partities kan worden verbruikt door maximaal 12 consumers parallel binnen een consumergroep. Het aantal partities is een capaciteitsplanningsbeslissing die u maakt bij het aanmaken van het topic — over-partitioneren heeft kosten (meer bestandshandvatten, meer replicatie-overhead), onder-partitioneren beperkt de doorvoer.
- **Consumergroepen** staan meerdere onafhankelijke applicaties toe om hetzelfde topic te verbruiken. Kafka houdt de offset van elke consumergroep onafhankelijk bij. Uw fraudedetectiesysteem en uw analysepipeline kunnen beide hetzelfde betalingstopic verbruiken zonder te interfereren.
- **Replicatie** biedt fouttolerantie. Een replicatiefactor van 3 betekent dat elk bericht naar 3 brokers wordt geschreven. `min.insync.replicas=2` zorgt ervoor dat een schrijfbewerking alleen wordt bevestigd nadat 2 replica's het bevestigen — de afweging duurzaamheid/latentie om af te stemmen.

### Producer: Betrouwbaar Schrijven van Gebeurtenissen

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

### Consumer: At-Least-Once Verwerking met Idempotentie

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

De kritieke ontwerpbeperking: **uw verwerkingsfunctie moet idempotent zijn.** At-least-once levering betekent dat u af en toe hetzelfde bericht twee keer verwerkt — bij het herstarten van de consumer, herbalancering of na een commitfout. Gebruik de natuurlijke idempotentiesleutel van de gebeurtenis (gewoonlijk `event_id`) en check-then-insert-patronen in uw statusopslag.

---

## Apache Flink: Streamverwerking op Schaal

Kafka verwerkt het vervoer van gebeurtenissen. Flink verwerkt stateful berekeningen op die gebeurtenisstromen: venstergeaggregaties, verrijkingsjoins, CEP (Complex Event Processing) en exactly-once stateful transformaties.

### Een Flink Job-skelet: Aggregatie van Fraudesignalen

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

### Operationele Overwegingen voor Flink

**Checkpointing is alles.** De exactly-once-garanties van Flink zijn afhankelijk van consistente checkpoints naar duurzame opslag (S3, GCS, HDFS). Als checkpointing consequent mislukt, werkt uw job at-least-once of slechter. Monitor checkpointduur en -mislukkingen als eersteklas SLI's.

**Selectie van statusbackend:**
- `HashMapStateBackend` (in-heap) — snel, maar status gaat verloren bij een taakmanagerfout en beperkt de statusgrootte tot de heapgrootte. Acceptabel voor stateloze of low-state jobs.
- `EmbeddedRocksDBStateBackend` — status op lokale schijf + checkpointed naar externe opslag. Vereist voor grote status (joins tegen opzoektabellen, langvenstersaggregaties). Hogere latentie dan in-heap maar noodzakelijk voor productieworkloads.

**Watermarkafstemming:** Uw watermarkstrategie bepaalt hoe lang Flink wacht op late gebeurtenissen voordat een venster wordt gesloten. Te agressief (korte vertraging) en u verliest late gebeurtenissen. Te conservatief (lange vertraging) en u verhoogt de end-to-end latentie. Profileer uw gebeurtenistijdverdeling en stel de vertraging in op het 99e percentiel van de gebeurtenisvertraging, niet het maximum.

---

## Schema-evolutie: Pipelinebreuk Voorkomen

Schema's veranderen. De dienst die `payments.events.v2` produceert, moet uiteindelijk een veld toevoegen, een veld hernoemen of een type wijzigen. Zonder een schema-beheerstrategie breken schemawijzigingen downstream consumers in productie.

**Confluent Schema Registry** is de standaardoplossing voor Avro, Protobuf en JSON Schema. Elke schemaversie wordt geregistreerd en gevalideerd tegen een compatibiliteitsmodus:

- **Achterwaartse compatibiliteit** — Nieuw schema kan gegevens lezen die door het oude schema zijn geschreven. Nieuwe consumers kunnen oude berichten lezen. Veilig voor het toevoegen van optionele velden.
- **Voorwaartse compatibiliteit** — Oud schema kan gegevens lezen die door het nieuwe schema zijn geschreven. Oude consumers kunnen nieuwe berichten lezen. Veilig voor het verwijderen van optionele velden.
- **Volledige compatibiliteit** — Zowel achterwaarts als voorwaarts. Meest restrictief maar veiligst voor langlopende consumergroepen.

De operationele regel: **dwing `FULL_TRANSITIVE` compatibiliteit in productie af.** Elke schemawijziging die oude producers of consumers zou breken, moet door een meerstappenmigratie gaan:

1. Voeg het nieuwe veld toe als optioneel met een standaardwaarde (achterwaarts compatibel)
2. Implementeer alle consumers om het nieuwe veld te verwerken
3. Implementeer producers om het nieuwe veld te vullen
4. Markeer het oude veld als verouderd
5. Nadat alle consumers zijn bijgewerkt, verwijder het oude veld in een volgende release

Verwijder nooit een verplicht veld, hernoem een veld niet of wijzig een veldtype in een enkele implementatie.

---

## Change Data Capture (CDC): Streamen vanuit Databases

Veel event-driven architecturen moeten wijzigingen van bestaande relationele databases naar Kafka streamen zonder applicatiecode te wijzigen. Change Data Capture leest het transactielogboek van de database en publiceert wijzigingen op rijniveau als gebeurtenissen.

**Debezium** is het standaard open-source CDC-platform. Het ondersteunt PostgreSQL (logische replicatie), MySQL (binlog), Oracle (LogMiner) en SQL Server (CDC). Een Debezium-connector die is ingezet in Kafka Connect leest het transactielogboek en publiceert `INSERT`-, `UPDATE`- en `DELETE`-gebeurtenissen naar Kafka-topics.

Belangrijke operationele overwegingen voor Debezium CDC:
- Schakel `REPLICA IDENTITY FULL` in op PostgreSQL-tabellen waarvan u volledige voor/na-rijafbeeldingen op updates wilt (standaard bevat alleen de primaire sleutel in de vorige afbeelding)
- Replicatieslots accumuleren WAL als de connector achterloopt — monitor slotvertraging agressief; ongecontroleerde groei kan de schijf vullen en PostgreSQL laten crashen
- Initiële snapshot van grote tabellen kan uren duren en aanzienlijke databasebelasting genereren — plan dit in tijdens perioden met weinig verkeer

---

## Data Lakehouse en dbt-transformaties

De moderne datastack convergeert op het **lakehouse-patroon**: open tabelformaten (Apache Iceberg, Delta Lake) op objectopslag bieden ACID-transacties, tijdreizen en schema-evolutie op de opslaglaag, bediend door query-engines (Trino, Spark, Snowflake) en een rekenlaag.

Streamverwerkingsuitvoer landt direct in Iceberg-tabellen. dbt draait transformatiemodellen daarboven voor analytische gebruiksgevallen:

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

## Pipeline-observeerbaarheid: De Niet-Onderhandelbare Laag

Een datapipeline zonder observeerbaarheid is een aansprakelijkheid. U weet niet dat het kapot is totdat iemand klaagt over verouderde dashboards of gemiste SLA's. De observeerbaarheidslaag voor datapipelines omvat vier dimensies:

**Versheid:** Komen gegevens op tijd aan? Definieer SLO's per topic (bijv. het betalingstopic moet binnen de laatste 60 seconden gebeurtenissen hebben). Waarschuw wanneer de nieuwste tijdstempel van de gebeurtenis de SLO-drempel overschrijdt.

**Volume:** Is het gegevensvolume binnen verwachte grenzen? Plotselinge dalingen duiden op upstream-storingen of -uitval. Plotselinge pieken duiden op gegevenskwaliteitsproblemen of upstream-incidenten. Gebruik statistische procesbeheersing (voortschrijdend gemiddelde + standaarddeviatiebandbreedte) in plaats van statische drempels voor volumemeldingen.

**Schema:** Voldoen gebeurtenissen aan het geregistreerde schema? Volg het percentage schemavalidatiefouten per topic. Een piek in schemafouten betekent dat een producer een brekende wijziging heeft geïmplementeerd.

**End-to-end latentie:** Hoe lang duurt het van het maken van de gebeurtenis tot de beschikbaarheid in de bedieningslaag? Instrumenteer met het aanmaaktijdstempel van de gebeurtenis ingebed in de gebeurtenis, en meet op elke fase van de pipeline. P50/P95/P99-latentie per pipelinefase.

Tools: **OpenTelemetry** voor instrumentatie, **Prometheus + Grafana** voor statistieken, **Apache Atlas** of **OpenMetadata** voor data-lineage. Great Expectations of Soda voor gegevenskwaliteitsbeweringen ingebed in de pipeline.

---

## Kostenoptimalisatie

Streaminginfrastructuur is duur als het niet wordt bijgehouden. De grootste kostenhendelaar:

- **Kafka-retentie:** Bewaar gegevens in Kafka niet langer dan vereist voor herstel van de consumergroep (72 uur is gewoonlijk voldoende). Gebruik Kafka tiered storage om oudere segmenten te verplaatsen naar objectopslag tegen aanzienlijk lagere kosten als lange retentie voor replay vereist is.
- **Flink-parallellisme:** Overgeprovisioneerde Flink-taakmanagers zijn een veelvoorkomende verspilling. Gebruik automatisch schalen van Flink (Kubernetes HPA op aangepaste statistieken, of beheerd automatisch schalen in Flink op Kubernetes-operator) om parallellisme te schalen op basis van Kafka-consumergroepvertraging.
- **Compute-storage scheiding:** Sla alle persistente status op in objectopslag (Iceberg op S3), niet in rekenknooppunten. Rekenclusters kunnen schalen naar nul tussen jobs. Dit is het fundamentele kostenvoordeel van het lakehouse-patroon ten opzichte van Hadoop-era architecturen.
- **Gelaagde verwerking:** Niet alle gebeurtenissen hebben sub-secondelatentie nodig. Routeer hoogprioritaire gebeurtenistypen via de realtime Flink-pipeline; routeer lagerprioritaire gebeurtenissen naar een micro-batchjob (elke 5 minuten). Het kostenverschil is aanzienlijk.

> De organisaties die streaminginfrastructuur goed bouwen, hebben één eigenschap gemeen: ze instrumenteren eerst en optimaliseren continu. Ze ontwerpen niet voor kosten — ze ontwerpen voor correctheid en observeerbaarheid, en gebruiken dan de observeerbaarheidsgegevens om weloverwogen kostenbeslissingen te nemen. Voortijdige kostenoptimalisatie in data-infrastructuur is hoe u eindigt met ononderhoudsbare pipelines die niemand vertrouwt.

De moderne datapipeline is geen reeks scripts. Het is een gedistribueerd systeem met dezelfde operationele vereisten als elke productiedienst: SLO's, runbooks, piketdiensten en post-mortems van incidenten. De teams die het zo behandelen, bouwen infrastructuur die in de loop der jaren waarde opbouwt. De teams die dat niet doen, zijn voortdurend brandjes aan het blussen.
