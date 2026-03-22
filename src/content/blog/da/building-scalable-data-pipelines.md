---
title: "Opbygning af skalerbare datapipelines: Hændelsesdrevet arkitektur og den moderne datastak"
date: "2026-03-22"
author: "HyperCubeSphere Engineering"
tags: ["dataingeniørfag", "kafka", "flink", "strømbehandling", "datapipelines"]
excerpt: "Batchbehandling er ved at dø ud. Hændelsesdrevne, streaming-first-arkitekturer er ingeniørstandarden for enhver organisation, der har brug for data til at informere beslutninger på sekunder, ikke timer. Sådan bygger du dem."
---

Kløften mellem, hvornår noget sker, og hvornår din organisation ved det, koster dig mere, end du tror. Batchpipelines, der kører ved midnat, producerer forældet data, der driver gårsdagens beslutninger. Inden for svindeldetektering er det et finansielt tab. Inden for operationel intelligens er det et nedbrud, du ikke forhindrede. Inden for kundeoplevelse er det et churn-signal, du reagerede på for sent.

Dette indlæg er et praktisk dypdyk i hændelsesdrevet dataarkitektur: hvornår du skal streame, hvornår du skal batch'e, hvordan du bygger Kafka-pipelines, der faktisk overlever produktion, hvordan du kører Flink i stor skala, og hvordan du bygger det observabilitetslag, der holder alt ærligt.

---

## Batch vs. strøm vs. hybrid: Valg af det rigtige mønster

Beslutningen mellem batch- og strømbehandling er ikke en religiøs. Det er en ingeniørmæssig afvejning drevet af latenskrav, datakarakteristika og budget for operationel kompleksitet.

### Hvornår batch stadig er det rigtige svar

Batchbehandling er enklere at bygge, enklere at fejlfinde og enklere at genbehandle. For brugstilfælde, hvor friskhedskrav måles i timer eller dage, er batch ofte det korrekte valg:

- **Historisk analyse og rapportering** — Månedlige finansielle rapporter, kvartalsvise forretningsgennemgange, efterlevelsesrapporter. Data er i sagens natur tidspunktsbaserede. Batch ETL til et datalager er passende.
- **Modeltræning** — De fleste ML-træningspipelines er af natur batch. Træning på streaming-data kræver specialiseret infrastruktur (online-læring, inkrementel træning), der tilføjer betydelig kompleksitet med begrænset fordel, medmindre modellen kræver sub-time friskhed.
- **Tunge transformationer** — Komplekse joins på tværs af store datasæt (milliarder af rækker) håndteres ofte mere effektivt af MPP-forespørgselsmotorer (BigQuery, Snowflake, Redshift) end strømprocessorer, især hvis join-nøglerne ikke er rent ordnet.

### Hvornår streaming er påkrævet

Strømbehandling er det rigtige mønster, når:

- **Latenskrav er sub-minutter** — Svindelvurdering, realtidspersonalisering, operationel alarmering, live-dashboards. Batchpipelines kan ikke opfylde disse SLA'er.
- **Data ankommer kontinuerligt og skal handles på** — IoT-telemetri, klikstrøm, finansielle ticks, applikationshændelser. At buffere disse data til batchbehandling betyder, at du kasserer de tidsmæssige relationer mellem hændelser, der indeholder det meste signal.
- **Hændelsesdrevne mikrotjenester** — Tjenester, der reagerer på hændelser (ordre afgivet → udløse opfyldelse → underrette lager), er arkitektonisk streaming. At behandle disse som batchprocesser introducerer latens og kobling.

### Den hybride (Lambda/Kappa) arkitektur

Mange produktionssystemer har brug for begge. Lambda-arkitekturen (populariseret af Nathan Marz) kører et strømllag til realtidsresultater og et batchlag til nøjagtig historisk genberegning, og betjener forespørgsler fra en sammenslået visning. Kappa-arkitekturen forenkler dette ved kun at bruge strømlaget med evnen til at genbehandle fra uforanderlige hændelseslogfiler.

**Kappa-mønstret har i stor udstrækning vundet** i moderne stakke. Årsagen: at vedligeholde to separate behandlingskodebaser (batch og strøm), der skal producere ækvivalente resultater, er operationelt brutalt. Kafkas uendelige opbevaring (via tiered storage) plus en strømprocessor som Flink kan håndtere både realtidsbehandling og historisk genbehandling fra den samme kodebase.

---

## Kafka-arkitektur: Fundamentet

Apache Kafka er de facto-standarden for hændelsesstrømningsinfrastruktur i virksomhedsskala. At forstå internals er essentielt for at bygge pålidelige pipelines.

### Kernebegreber

- **Topics** er append-only, ordnede, uforanderlige logfiler. Hændelser opdateres aldrig på plads; nye hændelser tilføjes altid. Dette er det grundlæggende designvalg, der gør Kafka pålidelig og skalerbar.
- **Partitioner** er enheden for parallelisme. Et topic med 12 partitioner kan forbruges af op til 12 forbrugere parallelt inden for en forbrugergruppe. Partitionsantal er en kapacitetsplanlægningsbeslutning, du træffer ved topic-oprettelse — over-partitionering har omkostninger (flere filhåndtag, mere replikeringsomkostning), under-partitionering begrænser gennemstrømning.
- **Forbrugergrupper** giver mulighed for, at flere uafhængige applikationer kan forbruge det samme topic. Kafka sporer hver forbrugergruppes offset uafhængigt. Dit svindeldetekteringssystem og din analysepipeline kan begge forbruge det samme betalings-topic uden at forstyrre hinanden.
- **Replikering** giver fejltolerance. En replikeringsfaktor på 3 betyder, at enhver besked skrives til 3 mæglere. `min.insync.replicas=2` sikrer, at en skrivning kun bekræftes, efter at 2 replikaer bekræfter det — holdbarhed/latens-afvejningen, der skal justeres.

### Producent: Skrivning af hændelser pålideligt

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

### Forbruger: At-least-once-behandling med idempotens

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

Den kritiske designbegrænsning her: **din behandlingsfunktion skal være idempotent.** At-least-once-levering betyder, at du lejlighedsvis behandler den samme besked to gange — ved forbrugergenstart, genbalancering eller efter en commit-fejl. Brug hændelsens naturlige idempotensnøgle (normalt `event_id`) og check-then-insert-mønstre i dit tilstandslager.

---

## Apache Flink: Strømbehandling i stor skala

Kafka håndterer hændelsestransport. Flink håndterer tilstandsmæssig beregning på disse hændelsesstrømme: vinduesaggregationer, berigningsjoinss, CEP (Complex Event Processing) og exactly-once tilstandstransformationer.

### Et Flink-jobskelet: Aggregering af svindelsignaler

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

### Operationelle overvejelser for Flink

**Checkpointing er alt.** Flinkens exactly-once-garantier afhænger af konsekvente checkpoints til varig lagring (S3, GCS, HDFS). Hvis checkpointing konsekvent mislykkes, kører dit job at-least-once eller værre. Overvåg checkpoint-varighed og fejl som førsteklasses SLI'er.

**Valg af tilstandsbackend:**
- `HashMapStateBackend` (in-heap) — hurtig, men tilstand mistes ved task manager-fejl og begrænser tilstandsstørrelsen til heap-størrelsen. Acceptabel til tilstandsløse eller lav-tilstands-jobs.
- `EmbeddedRocksDBStateBackend` — tilstand på lokal disk + checkpointet til fjernlagring. Påkrævet til stor tilstand (joins mod opslagstabeller, lang-vindues-aggregationer). Højere latens end in-heap, men nødvendig til produktionsarbejdsbelastninger.

**Vandmærke-justering:** Din vandmærkestrategi bestemmer, hvor længe Flink venter på sene hændelser, inden et vindue lukkes. For aggressiv (kort forsinkelse) og du taber sene hændelser. For konservativ (lang forsinkelse) og du øger end-to-end-latensen. Profileer din hændelsestidsfordeling og sæt forsinkelsen ved den 99. percentil af hændelsesefterslæb, ikke maksimum.

---

## Schemaevolution: Undgåelse af pipeline-sammenbrud

Skemaer ændres. Den tjeneste, der producerer `payments.events.v2`, vil til sidst have brug for at tilføje et felt, omdøbe et felt eller ændre en type. Uden en skemahåndteringsstrategi bryder skemaændringer downstream-forbrugere i produktion.

**Confluent Schema Registry** er standardløsningen til Avro, Protobuf og JSON Schema. Enhver skemaversion registreres og valideres mod en kompatibilitetstilstand:

- **Bagudkompatibilitet** — Nyt skema kan læse data skrevet af gammelt skema. Nye forbrugere kan læse gamle beskeder. Sikkert til at tilføje valgfrie felter.
- **Fremadkompatibilitet** — Gammelt skema kan læse data skrevet af nyt skema. Gamle forbrugere kan læse nye beskeder. Sikkert til at fjerne valgfrie felter.
- **Fuld kompatibilitet** — Både bagud og fremad. Mest restriktiv, men sikrest til langtkørende forbrugergrupper.

Den operationelle regel: **håndhæv `FULL_TRANSITIVE`-kompatibilitet i produktion.** Enhver skemaændring, der ville bryde enten gamle producenter eller gamle forbrugere, skal gå gennem en migrering i flere trin:

1. Tilføj det nye felt som valgfrit med en standardværdi (bagudkompatibelt)
2. Implementer alle forbrugere til at håndtere det nye felt
3. Implementer producenter til at udfylde det nye felt
4. Markér det gamle felt som forældet
5. Fjern det gamle felt i en efterfølgende udgivelse, efter at alle forbrugere er opdateret

Fjern aldrig et påkrævet felt, omdøb aldrig et felt eller ændr en felttype i en enkelt implementering.

---

## Change Data Capture (CDC): Streaming fra databaser

Mange hændelsesdrevne arkitekturer har brug for at streame ændringer fra eksisterende relationsdatabaser til Kafka uden at ændre applikationskode. Change Data Capture læser databasens transaktionslog og offentliggør ændringer på rækkeniveau som hændelser.

**Debezium** er standardplatformen for open source-CDC. Den understøtter PostgreSQL (logisk replikering), MySQL (binlog), Oracle (LogMiner) og SQL Server (CDC). En Debezium-connector implementeret i Kafka Connect læser transaktionsloggen og offentliggør `INSERT`-, `UPDATE`- og `DELETE`-hændelser til Kafka-topics.

Centrale operationelle overvejelser for Debezium CDC:
- Aktiver `REPLICA IDENTITY FULL` på PostgreSQL-tabeller, du ønsker fulde før/efter-rækkesbilleder på opdateringer (standard inkluderer kun primærnøgle i billedet før)
- Replikeringspladser akkumulerer WAL, hvis connectoren falder bagud — overvåg pladsforsinkelse aggressivt; ukontrolleret vækst kan fylde disken og crashe PostgreSQL
- Indledende snapshot af store tabeller kan tage timer og generere betydelig databasebelastning — planlæg i perioder med lav trafik

---

## Data Lakehouse og dbt-transformationer

Den moderne datastak konvergerer mod **lakehouse-mønstret**: åbne tabelformater (Apache Iceberg, Delta Lake) på objektlagring giver ACID-transaktioner, tidsrejser og schemaevolution på lagringslaget, betjent af forespørgselsmotorer (Trino, Spark, Snowflake) og et beregningslag.

Strømbehandlingsoutput lander direkte i Iceberg-tabeller. dbt kører transformationsmodeller ovenpå til analytiske brugstilfælde:

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

## Pipeline-observabilitet: Det ikke-forhandlingsbare lag

En datapipeline uden observabilitet er en ansvarlig risiko. Du ved ikke, at den er i stykker, før nogen klager over forældet dashboards eller mistede SLA'er. Observabilitetslaget til datapipelines dækker fire dimensioner:

**Friskhed:** Ankommer data til tiden? Definer SLO'er pr. topic (f.eks. bør betalings-topic have hændelser inden for de seneste 60 sekunder). Alarmér, når det seneste hændelsestidsstempel overskrider SLO-tærsklen.

**Volumen:** Er datavolumen inden for forventede grænser? Pludselige fald indikerer upstream-fejl eller nedbrud. Pludselige stigninger indikerer datakvalitetsproblemer eller hændelser upstream. Brug statistisk proceskontrol (glidende gennemsnit + standardafvigelsesband) frem for statiske tærskler til volumenalarmer.

**Skema:** Er hændelser i overensstemmelse med det registrerede skema? Spor skemavalideringsfejlrater pr. topic. En stigning i skemafejl betyder, at en producent implementerede en brud-ændring.

**End-to-end-latens:** Hvor lang tid tager det fra hændelsesoprettelse til tilgængelighed i serveringslaget? Instrumentér med hændelsesoprettelsestidsstempel indlejret i hændelsen og mål ved hvert trin i pipelinen. P50/P95/P99-latens pr. pipeline-trin.

Værktøjer: **OpenTelemetry** til instrumentering, **Prometheus + Grafana** til metrikker, **Apache Atlas** eller **OpenMetadata** til datalinie. Great Expectations eller Soda til datakvalitetspåstande indlejret i pipelinen.

---

## Omkostningsoptimering

Streaming-infrastruktur er dyr, hvis den efterlades ukontrolleret. De største omkostningsgenstande:

- **Kafka-opbevaring:** Bevar ikke data i Kafka længere end det, der kræves til forbrugergruppegenopretning (72 timer er normalt tilstrækkeligt). Brug Kafkas tiered storage til at flytte ældre segmenter til objektlagring til dramatisk lavere omkostning, hvis lang opbevaring kræves til afspilning.
- **Flink-parallelisme:** Overprovisionerede Flink task managers er et almindeligt spild. Brug Flinkens autoskalering (Kubernetes HPA på tilpassede metrikker eller administreret autoskalering i Flink på Kubernetes-operator) til at skalere parallelisme baseret på Kafka-forbrugergruppeforsinkelse.
- **Beregnings-lagrings-separation:** Gem al vedvarende tilstand i objektlagring (Iceberg på S3), ikke i beregningsknuder. Beregningsklynger kan skalere til nul mellem jobs. Dette er den grundlæggende omkostningsfordel ved lakehouse-mønstret i forhold til Hadoop-era-arkitekturer.
- **Niveaudelt behandling:** Ikke alle hændelser har brug for sub-sekunds-latens. Rut høj-prioritets hændelsestyper gennem den realtids-Flink-pipeline; rut lavere-prioritets hændelser til et mikrobatch-job (hvert 5. minut). Omkostningsforskellen er betydelig.

> De organisationer, der bygger streaming-infrastruktur godt, deler ét træk: de instrumenterer først og optimerer kontinuerligt. De designer ikke til omkostning — de designer til korrekthed og observabilitet, og bruger derefter observabilitetsdata til at træffe informerede omkostningsbeslutninger. Prematur omkostningsoptimering i datainfrastruktur er, hvordan du ender med ikke-vedligeholdelige pipelines, som ingen stoler på.

Den moderne datapipeline er ikke en sekvens af scripts. Det er et distribueret system med de samme operationelle krav som enhver produktionstjeneste: SLO'er, driftsbøger, vagtrotationer og hændelses-postmortem. De teams, der behandler det på den måde, bygger infrastruktur, der øges i værdi over år. De teams, der ikke gør, er konstant i brandbekæmpelse.
