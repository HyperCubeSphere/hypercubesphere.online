---
title: "Costruire Pipeline di Dati Scalabili: Architettura Event-Driven e il Modern Data Stack"
date: "2026-03-22"
author: "HyperCubeSphere Engineering"
tags: ["ingegneria dei dati", "kafka", "flink", "stream processing", "pipeline di dati"]
excerpt: "L'elaborazione batch sta morendo. Le architetture event-driven e streaming-first sono lo standard ingegneristico per qualsiasi organizzazione che ha bisogno che i dati informino le decisioni in secondi, non in ore. Ecco come costruirle."
---

Il divario tra quando accade qualcosa e quando la tua organizzazione ne viene a conoscenza ti sta costando più di quanto pensi. Le pipeline batch che vengono eseguite a mezzanotte producono dati obsoleti che guidano le decisioni di ieri. Nel rilevamento delle frodi, questo è una perdita finanziaria. Nell'intelligenza operativa, è un'interruzione che non hai prevenuto. Nell'esperienza del cliente, è un segnale di abbandono su cui hai agito troppo tardi.

Questo articolo è un'analisi pratica approfondita dell'architettura dei dati event-driven: quando utilizzare lo streaming, quando il batch, come costruire pipeline Kafka che sopravvivano davvero in produzione, come eseguire Flink su scala e come costruire il livello di osservabilità che mantiene tutto onesto.

---

## Batch vs. Stream vs. Ibrido: Scegliere il Pattern Giusto

La decisione tra elaborazione batch e stream non è una questione religiosa. È un compromesso ingegneristico guidato dai requisiti di latenza, dalle caratteristiche dei dati e dai budget di complessità operativa.

### Quando il Batch è Ancora la Risposta Giusta

L'elaborazione batch è più semplice da costruire, più semplice da eseguire il debug e più semplice da rielaborare. Per i casi d'uso in cui i requisiti di freschezza si misurano in ore o giorni, il batch è spesso la scelta corretta:

- **Analisi storica e reporting** — Rapporti finanziari mensili, revisioni aziendali trimestrali, rapporti di conformità. I dati sono intrinsecamente point-in-time. L'ETL batch in un warehouse è appropriato.
- **Addestramento dei modelli** — La maggior parte delle pipeline di addestramento ML è batch per natura. L'addestramento su dati in streaming richiede un'infrastruttura specializzata (apprendimento online, addestramento incrementale) che aggiunge complessità significativa con benefici limitati a meno che il modello non richieda freschezza inferiore all'ora.
- **Trasformazioni pesanti** — Le join complesse su grandi dataset (miliardi di righe) sono spesso gestite più efficientemente dai motori di query MPP (BigQuery, Snowflake, Redshift) rispetto ai processori di stream, specialmente se le chiavi di join non sono ordinatamente ordinate.

### Quando lo Streaming è Necessario

L'elaborazione stream è il pattern corretto quando:

- **I requisiti di latenza sono inferiori al minuto** — Scoring delle frodi, personalizzazione in tempo reale, alerting operativo, dashboard live. Le pipeline batch non possono soddisfare questi SLA.
- **I dati arrivano continuamente e devono essere elaborati** — Telemetria IoT, clickstream, tick finanziari, eventi applicativi. Bufferizzare questi dati per l'elaborazione batch significa scartare le relazioni temporali tra gli eventi che contengono il segnale più prezioso.
- **Microservizi event-driven** — I servizi che reagiscono agli eventi (ordine effettuato → attivare il fulfillment → notificare il magazzino) sono architetturalmente streaming. Trattarli come processi batch introduce latenza e accoppiamento.

### L'Architettura Ibrida (Lambda/Kappa)

Molti sistemi di produzione necessitano di entrambi. L'architettura Lambda (popolarizzata da Nathan Marz) esegue un livello di stream per i risultati in tempo reale e un livello batch per la ricalcolazione storica accurata, servendo le query da una vista unificata. L'architettura Kappa semplifica questo usando solo il livello stream, con la possibilità di rielaborare da log di eventi immutabili.

**Il pattern Kappa ha vinto in larga misura** negli stack moderni. Il motivo: mantenere due codebase di elaborazione separate (batch e stream) che devono produrre risultati equivalenti è brutalmente oneroso operativamente. La retention infinita di Kafka (tramite tiered storage) più un processore di stream come Flink può gestire sia l'elaborazione in tempo reale che la rielaborazione storica dalla stessa codebase.

---

## Architettura Kafka: La Fondazione

Apache Kafka è lo standard de facto per l'infrastruttura di event streaming su scala enterprise. Capire gli internals è essenziale per costruire pipeline affidabili.

### Concetti Fondamentali

- I **Topic** sono log append-only, ordinati e immutabili. Gli eventi non vengono mai aggiornati in place; i nuovi eventi vengono sempre aggiunti. Questa è la scelta progettuale fondamentale che rende Kafka affidabile e scalabile.
- Le **Partition** sono l'unità di parallelismo. Un topic con 12 partition può essere consumato da fino a 12 consumer in parallelo all'interno di un consumer group. Il numero di partition è una decisione di pianificazione della capacità che si prende alla creazione del topic — la sovra-partizione ha costi (più file handle, più overhead di replica), la sotto-partizione limita il throughput.
- I **Consumer group** permettono a più applicazioni indipendenti di consumare lo stesso topic. Kafka traccia l'offset di ogni consumer group indipendentemente. Il sistema di rilevamento delle frodi e la pipeline analitica possono entrambi consumare lo stesso topic dei pagamenti senza interferenze.
- La **Replica** fornisce tolleranza ai guasti. Un fattore di replica di 3 significa che ogni messaggio viene scritto su 3 broker. `min.insync.replicas=2` garantisce che una scrittura venga riconosciuta solo dopo che 2 repliche la confermano — il compromesso durabilità/latenza da configurare.

### Producer: Scrittura Affidabile degli Eventi

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

### Consumer: Elaborazione At-Least-Once con Idempotenza

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

Il vincolo progettuale critico: **la funzione di elaborazione deve essere idempotente.** La consegna at-least-once significa che occasionalmente si elaborerà lo stesso messaggio due volte — al riavvio del consumer, al ribilanciamento o dopo un fallimento del commit. Usare la chiave di idempotenza naturale dell'evento (solitamente `event_id`) e i pattern check-then-insert nel proprio state store.

---

## Apache Flink: Stream Processing su Scala

Kafka gestisce il trasporto degli eventi. Flink gestisce la computazione stateful su quegli stream di eventi: aggregazioni a finestra, join di arricchimento, CEP (Complex Event Processing) e trasformazioni stateful exactly-once.

### Uno Scheletro di Job Flink: Aggregazione dei Segnali di Frode

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

### Considerazioni Operative su Flink

**Il checkpointing è tutto.** Le garanzie exactly-once di Flink dipendono da checkpoint consistenti su storage durevole (S3, GCS, HDFS). Se il checkpointing fallisce costantemente, il job è in esecuzione at-least-once o peggio. Monitorare la durata e i fallimenti dei checkpoint come SLI di primo livello.

**Selezione del backend di stato:**
- `HashMapStateBackend` (in-heap) — veloce, ma lo stato viene perso in caso di failure del task manager e limita la dimensione dello stato alla dimensione dell'heap. Accettabile per job senza stato o con poco stato.
- `EmbeddedRocksDBStateBackend` — stato su disco locale + checkpoint su storage remoto. Richiesto per stati grandi (join su lookup table, aggregazioni su finestre lunghe). Latenza più alta rispetto all'in-heap ma necessario per i carichi di lavoro di produzione.

**Tuning del watermark:** La strategia watermark determina quanto a lungo Flink aspetta gli eventi in ritardo prima di chiudere una finestra. Troppo aggressiva (breve ritardo) e si perdono eventi in ritardo. Troppo conservativa (lungo ritardo) e si aumenta la latenza end-to-end. Profilare la distribuzione del tempo degli eventi e impostare il ritardo al 99° percentile del lag degli eventi, non al massimo.

---

## Evoluzione dello Schema: Evitare la Rottura delle Pipeline

Gli schemi cambiano. Il servizio che produce `payments.events.v2` alla fine dovrà aggiungere un campo, rinominare un campo o cambiare un tipo. Senza una strategia di gestione degli schemi, le modifiche agli schemi rompono i consumer a valle in produzione.

Il **Confluent Schema Registry** è la soluzione standard per Avro, Protobuf e JSON Schema. Ogni versione dello schema viene registrata e validata rispetto a una modalità di compatibilità:

- **Compatibilità backward** — Il nuovo schema può leggere i dati scritti dal vecchio schema. I nuovi consumer possono leggere i vecchi messaggi. Sicuro per l'aggiunta di campi opzionali.
- **Compatibilità forward** — Il vecchio schema può leggere i dati scritti dal nuovo schema. I vecchi consumer possono leggere i nuovi messaggi. Sicuro per la rimozione di campi opzionali.
- **Compatibilità completa** — Sia backward che forward. Più restrittiva ma più sicura per i consumer group a lunga durata.

La regola operativa: **applicare la compatibilità `FULL_TRANSITIVE` in produzione.** Qualsiasi modifica allo schema che romperebbe i producer o i consumer precedenti deve passare attraverso una migrazione in più fasi:

1. Aggiungere il nuovo campo come opzionale con un valore predefinito (compatibile backward)
2. Distribuire tutti i consumer per gestire il nuovo campo
3. Distribuire i producer per popolare il nuovo campo
4. Contrassegnare il vecchio campo come deprecato
5. Dopo che tutti i consumer sono stati aggiornati, rimuovere il vecchio campo in una release successiva

Non rimuovere mai un campo obbligatorio, rinominare un campo o cambiare un tipo di campo in una singola distribuzione.

---

## Change Data Capture (CDC): Streaming dai Database

Molte architetture event-driven devono trasmettere in streaming le modifiche dai database relazionali esistenti in Kafka senza modificare il codice applicativo. Il Change Data Capture legge il log delle transazioni del database e pubblica le modifiche a livello di riga come eventi.

**Debezium** è la piattaforma CDC open-source standard. Supporta PostgreSQL (replica logica), MySQL (binlog), Oracle (LogMiner) e SQL Server (CDC). Un connettore Debezium distribuito in Kafka Connect legge il log delle transazioni e pubblica eventi `INSERT`, `UPDATE` e `DELETE` su topic Kafka.

Considerazioni operative chiave per Debezium CDC:
- Abilitare `REPLICA IDENTITY FULL` sulle tabelle PostgreSQL di cui si vogliono immagini complete prima/dopo per gli aggiornamenti (di default include solo la chiave primaria nell'immagine precedente)
- Gli slot di replica accumulano WAL se il connettore è in ritardo — monitorare aggressivamente il lag dello slot; una crescita non controllata può riempire il disco e far crashare PostgreSQL
- Lo snapshot iniziale di tabelle grandi può richiedere ore e generare un carico significativo sul database — pianificare durante i periodi a basso traffico

---

## Data Lakehouse e Trasformazioni dbt

Il modern data stack converge sul **pattern lakehouse**: i formati di tabella aperti (Apache Iceberg, Delta Lake) su object storage forniscono transazioni ACID, time travel ed evoluzione dello schema al livello storage, serviti da motori di query (Trino, Spark, Snowflake) e un livello compute.

Gli output dell'elaborazione stream atterrano direttamente nelle tabelle Iceberg. dbt esegue i modelli di trasformazione sopra per i casi d'uso analitici:

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

## Osservabilità della Pipeline: Il Livello Non Negoziabile

Una pipeline di dati senza osservabilità è una passività. Non si saprà che è rotta finché qualcuno non si lamenta di dashboard obsoleti o SLA mancati. Il livello di osservabilità per le pipeline di dati copre quattro dimensioni:

**Freschezza:** I dati arrivano in tempo? Definire SLO per topic (ad es. il topic dei pagamenti dovrebbe avere eventi negli ultimi 60 secondi). Avvisare quando il timestamp dell'ultimo evento supera la soglia SLO.

**Volume:** Il volume dei dati è entro i limiti attesi? I cali improvvisi indicano fallimenti o interruzioni a monte. I picchi improvvisi indicano problemi di qualità dei dati o incidenti a monte. Usare il controllo statistico del processo (media mobile + bande di deviazione standard) piuttosto che soglie statiche per gli alert di volume.

**Schema:** Gli eventi sono conformi allo schema registrato? Tracciare i tassi di fallimento della validazione dello schema per topic. Un picco di fallimenti dello schema significa che un producer ha distribuito una modifica che rompe la compatibilità.

**Latenza end-to-end:** Quanto tempo impiega un evento dalla creazione alla disponibilità nel livello di servizio? Strumentare con il timestamp di creazione dell'evento incorporato nell'evento, e misurare in ogni fase della pipeline. Latenza P50/P95/P99 per fase della pipeline.

Strumenti: **OpenTelemetry** per la strumentazione, **Prometheus + Grafana** per le metriche, **Apache Atlas** o **OpenMetadata** per il data lineage. Great Expectations o Soda per le asserzioni sulla qualità dei dati incorporate nella pipeline.

---

## Ottimizzazione dei Costi

L'infrastruttura di streaming è costosa se non viene controllata. Le leve di costo più importanti:

- **Retention Kafka:** Non conservare i dati in Kafka più a lungo di quanto richiesto per il recupero del consumer group (72 ore sono solitamente sufficienti). Usare il tiered storage di Kafka per spostare i segmenti più vecchi su object storage a un costo notevolmente inferiore se è necessaria una retention lunga per il replay.
- **Parallelismo Flink:** I task manager Flink sovra-provisioned sono uno spreco comune. Usare l'autoscaling di Flink (Kubernetes HPA su metriche personalizzate, o autoscaling gestito nell'operatore Flink su Kubernetes) per scalare il parallelismo in base al lag del consumer group Kafka.
- **Separazione compute-storage:** Memorizzare tutto lo stato persistente su object storage (Iceberg su S3), non nei nodi compute. I cluster compute possono scalare a zero tra i job. Questo è il vantaggio di costo fondamentale del pattern lakehouse rispetto alle architetture dell'era Hadoop.
- **Elaborazione a livelli:** Non tutti gli eventi necessitano di latenza inferiore al secondo. Instradare i tipi di eventi ad alta priorità attraverso la pipeline Flink in tempo reale; instradare gli eventi a priorità inferiore verso un job micro-batch (ogni 5 minuti). La differenza di costo è significativa.

> Le organizzazioni che costruiscono bene l'infrastruttura di streaming condividono una caratteristica: prima strumentano e poi ottimizzano continuamente. Non progettano per il costo — progettano per la correttezza e l'osservabilità, poi usano i dati di osservabilità per prendere decisioni di costo informate. L'ottimizzazione prematura dei costi nell'infrastruttura dati è il modo in cui si finisce con pipeline non manutenibili di cui nessuno si fida.

La pipeline di dati moderna non è una sequenza di script. È un sistema distribuito con gli stessi requisiti operativi di qualsiasi servizio di produzione: SLO, runbook, rotazioni on-call e post-mortem degli incidenti. I team che la trattano in questo modo costruiscono un'infrastruttura che aumenta di valore nel corso degli anni. I team che non lo fanno sono perpetuamente a spegnere incendi.
