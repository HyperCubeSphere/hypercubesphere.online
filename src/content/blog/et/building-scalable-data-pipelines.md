---
title: "Skaleeritavate andmekonveierite ehitamine: sündmuspõhine arhitektuur ja kaasaegne andmepinu"
date: "2026-03-22"
author: "HyperCubeSphere Engineering"
tags: ["andmeinseneeria", "kafka", "flink", "voogtöötlus", "andmekonveierid"]
excerpt: "Pakktöötlus sureb välja. Sündmuspõhised, vooguprioriteediga arhitektuurid on inseneeristandard iga organisatsiooni jaoks, mis vajab andmeid otsuste tegemiseks sekundite, mitte tundide jooksul. Siin on, kuidas neid ehitada."
---

Lõhe selle vahel, millal midagi juhtub ja millal teie organisatsioon sellest teada saab, maksab teile rohkem, kui arvate. Südaöös käivituvad pakk-konveierid toodavad aegunud andmeid, mis juhivad eilseid otsuseid. Pettuse tuvastamisel on see rahaline kaotus. Operatsioonilises luures on see katkestus, mida te ära ei hoidnud. Kliendikogumuses on see vaheldumissignaal, millele reageerite liiga hilja.

See artikkel on praktiline süvenemine sündmuspõhisesse andmearchitektuuri: millal vooguda, millal pakkida, kuidas ehitada Kafka konveiereid, mis tootmist üle elavad, kuidas Flink-i suures mahus käitada ja kuidas ehitada jälgitavuskiht, mis kõike seda ausana hoiab.

---

## Pakk vs. voog vs. hübriiditöötlus: õige mustri valimine

Otsus pakk- ja voogtöötluse vahel ei ole religioosne. See on inseneri kompromiss, mida juhivad latentsusnõuded, andmete omadused ja operatiivse keerukuse eelarve.

### Millal pakktöötlus on endiselt õige vastus

Pakktöötlust on lihtsam ehitada, siluda ja uuesti töödelda. Kasutusjuhtumite puhul, kus värskedusnõudeid mõõdetakse tundides või päevades, on pakktöötlus sageli õige valik:

- **Ajalooline analüütika ja aruandlus** — Igakuised finantsaruanded, kvartalipõhised äriülevaated, vastavusaruanded. Andmed on olemuselt ajas fikseeritud. Pakk-ETL andmehoidlasse on sobiv.
- **Mudelite treenimine** — Enamik ML-i treeningkonveiereid on olemuselt pakk. Voogedastusandmetel treenimine nõuab spetsialiseeritud infrastruktuuri (online-õpe, inkrementaalne treenimine), mis lisab märkimisväärset keerukust piiratud kasuga, kui mudel ei vaja alla tunni värskust.
- **Rasked teisendused** — Suurte andmekogumite (miljardeid ridu) keerulised ühendused käsitlevad MPP päringumootoritega (BigQuery, Snowflake, Redshift) sageli efektiivsemalt kui voogprotsessoritega, eriti kui ühendamisvõtmed pole puhtalt järjestatud.

### Millal voogtöötlus on vajalik

Voogtöötlus on õige muster, kui:

- **Latentsusnõuded on alla minuti** — Pettuse hindamine, reaalajas isikupärastamine, operatsioonihoiatused, otseülekande armatuurlauad. Pakk-konveierid ei suuda neid SLA-sid täita.
- **Andmed saabuvad pidevalt ja nendele peab reageerima** — IoT-telemeetria, klõpsuvood, finantstikid, rakendussündmused. Nende andmete puhverdamine pakktöötluseks tähendab sündmuste vaheliste ajaliste suhete äraviskamist, mis sisaldavad kõige rohkem signaali.
- **Sündmuspõhised mikröteenused** — Teenused, mis reageerivad sündmustele (tellimus esitatud → täitmise käivitamine → lao teavitamine), on arhitektuurselt voogsed. Nende kohtlemine pakk-protsessidena toob sisse latentsuse ja sidumise.

### Hübriid (Lambda/Kappa) arhitektuur

Paljud tootmissüsteemid vajavad mõlemat. Lambda arhitektuur (Nathan Marzi populaaristatud) käitab reaalajas tulemuste jaoks voogkihti ja täpse ajaloolise uuesti arvutamise jaoks pakkkihti, teenindades päringuid ühendatud vaates. Kappa arhitektuur lihtsustab seda, kasutades ainult voogkihti, võimaldades muutumatutest sündmuste logidest uuesti töötlemist.

**Kappa muster on kaasaegsetes pinudes suures osas võitnud.** Põhjus: kahe eraldi töötlemiskoodi aluse (pakk ja voog) säilitamine, mis peavad ekvivalentseid tulemusi tootma, on operatiivselt kohutav. Kafka lõpmatu säilitamine (kihistatud salvestuse kaudu) pluss voogprotsessor nagu Flink suudab käsitleda nii reaalajas töötlemist kui ka ajaloolist uuesti töötlemist samalt koodialuselt.

---

## Kafka arhitektuur: alus

Apache Kafka on de facto standard sündmuste voogedastuse infrastruktuuri jaoks ettevõtte mahus. Sisemise toimimise mõistmine on usaldusväärsete konveierite ehitamiseks hädavajalik.

### Põhimõisted

- **Teemad** on ainult-liitmis-, järjestatud, muutumatud logid. Sündmusi ei uuendata kunagi kohapeal; uued sündmused lisatakse alati. See on põhiline disainivalik, mis teeb Kafka usaldusväärseks ja skaleeritavaks.
- **Partitsioonid** on paralleelsuse ühik. Teemal 12 partitsiooniga saab samaaegselt tarbida kuni 12 tarbijat tarbijagrupis. Partitsioonide arv on võimsuse planeerimise otsus, mida tehakse teema loomisel.
- **Tarbijagrupid** võimaldavad mitmel sõltumatul rakendusel sama teemat tarbida. Kafka jälgib iga tarbiagrupi nihet iseseisvalt. Teie pettuste tuvastamise süsteem ja analüütikakonveier saavad mõlemad sama maksete teemat tarbida üksteist häirimata.
- **Replikatsioon** pakub tõrkekindlust. Replikatsioonitegur 3 tähendab, et iga sõnum kirjutatakse 3 maaklerile. `min.insync.replicas=2` tagab, et kirjutamine kinnitatakse ainult pärast seda, kui 2 repliikat selle kinnitavad — vastupidavuse/latentsuse kompromiss häälestamiseks.

### Tootja: sündmuste usaldusväärne kirjutamine

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

### Tarbija: „vähemalt üks kord" töötlemine idempotentsusega

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

Põhiline disainipiirang: **teie töötlusfunktsioon peab olema idempotentne.** „Vähemalt üks kord" kohaletoimetamine tähendab, et aeg-ajalt töötlete sama sõnumit kaks korda. Kasutage sündmuse loomulikku idempotentsusklahvi (tavaliselt `event_id`) ja „kontrolli-seejärel-sisesta" mustreid oma olekuhoidlas.

---

## Apache Flink: voogtöötlus suures mahus

Kafka käsitleb sündmuste transportimist. Flink käsitleb olekupõhiseid arvutusi nendel sündmuste voogudel: aknapõhised agregatsioonid, rikastamisühendused, CEP (Complex Event Processing) ja täpselt-üks-kord olekupõhised teisendused.

### Flink-ülesande skelett: pettussignaalide agregatsioon

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

### Flink-i operatsioonilised kaalutlused

**Kontrollpunktid on kõik.** Flink-i täpselt-üks-kord garantiid sõltuvad järjepidevast kontrollpunktitest püsivasse salvestusse (S3, GCS, HDFS). Kui kontrollpunktid pidevalt ebaõnnestuvad, töötab teie ülesanne vähemalt-üks-kord või halvemini. Jälgige kontrollpunktide kestust ja ebaõnnestumisi esmaklassiliste SLI-dena.

**Oleku tagaotsa valik:**
- `HashMapStateBackend` (mälus) — kiire, kuid olek kaotsi läheb ülesandehalduri ebaõnnestumise korral ja piirab oleku suuruse hunniku suurusele. Sobib olekuteta või madala olekuga ülesannete jaoks.
- `EmbeddedRocksDBStateBackend` — olek kohalikul kettal + kontrollpunktid kaugtalletuses. Vajalik suure oleku jaoks (ühendused otsinguatabelitega, pikkade akende agregatsioonid). Suurem latentsus kui mälus, kuid vajalik tootmiskoormuste jaoks.

**Veemärkide häälestamine:** Teie veemärgi strateegia määrab, kui kaua Flink ootab hilinenud sündmusi enne akna sulgemist. Liiga agressiivne (lühike viivitus) ja viskate hilinenud sündmused ära. Liiga konservatiivne (pikk viivitus) ja suurendate otspunkti latentsust. Profiilitage oma sündmuse aja jaotust ja seadke viivitus sündmuse viivituse 99. protsentiilile, mitte maksimumile.

---

## Skeemide evolutsioon: konveieri purunemise vältimine

Skeemid muutuvad. Teenus, mis toodab `payments.events.v2`, vajab lõpuks välja lisamist, välja ümbernimetamist või tüübi muutmist. Ilma skeemihalduse strateegiana purunevad skeemimuutused allavoolu tarbijad tootmises.

**Confluent Schema Registry** on standardlahendus Avro, Protobuf ja JSON Schema jaoks. Iga skeemi versioon registreeritakse ja valideeritakse ühilduvusrežiimi suhtes:

- **Tagasiühilduvus** — Uus skeem suudab lugeda vana skeemiga kirjutatud andmeid. Uued tarbijad saavad lugeda vanu sõnumeid. Ohutu valikuliste väljade lisamiseks.
- **Edasiühilduvus** — Vana skeem suudab lugeda uue skeemiga kirjutatud andmeid. Vanad tarbijad saavad lugeda uusi sõnumeid. Ohutu valikuliste väljade eemaldamiseks.
- **Täielik ühilduvus** — Mõlemad: tagasi- ja edasiühilduvus. Kõige piiravam, kuid kõige ohutum pikaajaliselt töötavate tarbiagruppide jaoks.

Operatsiooniline reegel: **jõustage tootmises `FULL_TRANSITIVE` ühilduvus.** Kõik skeemimuutused, mis võivad vanade tootjate või vanade tarbijate purunemist põhjustada, peavad läbima mitmeastmelise migratsiooni:

1. Lisage uus väli valikulisena vaikeväärtusega (tagasiühilduv)
2. Juurutage kõik tarbijad uue välja käsitlemiseks
3. Juurutage tootjad uue välja täitmiseks
4. Märkige vana väli aegunuks
5. Pärast kõigi tarbijate uuendamist eemaldage vana väli järgnevas väljaandes

Ärge kunagi eemaldage kohustuslikku välja, nimetage välja ümber ega muutke välja tüüpi ühe juurutusega.

---

## Change Data Capture (CDC): voogedastus andmebaasidest

Paljud sündmuspõhised arhitektuurid peavad muutusi olemasolevatest relatsiooniandmebaasidest Kafka-sse voogedastama ilma rakenduse koodi muutmata. CDC loeb andmebaasi tehingulogid ja avaldab reatasemel muutused sündmustena.

**Debezium** on standardne avatud lähtekoodiga CDC platvorm. See toetab PostgreSQL-i (loogiline replikatsioon), MySQL-i (binlog), Oracle'i (LogMiner) ja SQL Serverit (CDC). Kafka Connectis juurutatud Debezium-ühendus loeb tehingulogid ja avaldab `INSERT`, `UPDATE` ja `DELETE` sündmused Kafka teemadesse.

Peamised operatsioonilised kaalutlused Debezium CDC jaoks:
- Lubage `REPLICA IDENTITY FULL` PostgreSQL tabelitel, kus soovite uuendustel täielikuid enne/pärast rea pilte (vaikimisi sisaldab enne-pilt ainult primaarset võtit)
- Replikatsioonipesad koguvad WAL-i, kui ühendus maha jääb — jälgige pesa viivitust agressiivselt; kontrollimatu kasv võib täita ketta ja PostgreSQL-i krahhi põhjustada
- Suurte tabelite esialgne hetktõmmis võib võtta tunde ja genereerida märkimisväärset andmebaasi koormust — planeerige madala liiklusega aegadele

---

## Andmete lakehouse ja dbt teisendused

Kaasaegne andmepinu koondub **lakehouse mustri** poole: avatud tabeli formaadid (Apache Iceberg, Delta Lake) objektsalvestusel pakuvad ACID tehinguid, ajarände ja skeemi evolutsiooni salvestuskihil, mida teenindavad päringumootoriid (Trino, Spark, Snowflake) ja arvutuskiht.

Voogtöötluse väljundid maanduvad otse Iceberg tabelitesse. dbt käitab analüütiliste kasutusjuhtumite jaoks teisendusmudeleid peal:

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

## Konveieri jälgitavus: kohustuslik kiht

Andmekonveier ilma jälgitavuseta on kohustus. Te ei tea, et see on katki, kuni keegi kaebab aegunud armatuurlaudade või rikutud SLA-de üle. Andmekonveierite jälgitavuskiht hõlmab nelja mõõdet:

**Värskus:** Kas andmed saabuvad õigeaegselt? Määrake SLO-d teema kohta (nt maksete teema peaks sisaldama sündmusi viimase 60 sekundi jooksul). Hoiatage, kui viimase sündmuse ajatempel ületab SLO läve.

**Maht:** Kas andmemaht on oodatavates piirides? Ootamatud langused viitavad ülesvoolu tõrgetele või katkestustele. Ootamatud tõusud viitavad andmekvaliteedi probleemidele või ülesvoolu intsidentidele. Kasutage mahualarmide jaoks statistilist protsessikontrolli (libisev keskväärtus + standardhälbe ribad) staatiliste läve asemel.

**Skeem:** Kas sündmused vastavad registreeritud skeemile? Jälgige skeemi valideerimistõrgete määra teema kohta. Skeemitõrgete tõus tähendab, et tootja juurutas purunemismuutuse.

**Otspunkti latentsus:** Kui kaua kulub sündmuse loomisest kuni kättesaadavuseni teeninduskihis? Instrumenteerige sündmusse sisseehitatud sündmuse loomise ajatembliga ja mõõtke igal konveieri etapil. P50/P95/P99 latentsus konveieri etapi kohta.

Tööriistad: **OpenTelemetry** instrumenteerimiseks, **Prometheus + Grafana** mõõdikute jaoks, **Apache Atlas** või **OpenMetadata** andmete lineaarsuse jaoks. Great Expectations või Soda andmekvaliteedi väidete jaoks, mis on konveierisse manustatud.

---

## Kulude optimeerimine

Voogedastuse infrastruktuur on kallis, kui seda kontrollimata jätta. Suurimad kuluhoovad:

- **Kafka säilitamine:** Ärge säilitage andmeid Kafka-s kauem, kui on vaja tarbiagrupi taastamiseks (72 tundi on tavaliselt piisav). Kasutage Kafka kihistatud salvestust vanemate segmentide teisaldamiseks objektsalvestusse märkimisväärselt madalama hinnaga, kui pikk säilitamine on tagasiesituseks vajalik.
- **Flink-i paralleelsus:** Üle-provisioneeritud Flink ülesandehaldajad on tavaline raiskamine. Kasutage Flink-i automaatset skaleerimist (Kubernetes HPA kohandatud mõõdikutel või hallatud automaatne skaleerimine Kubernetes operaatoris) paralleelsuse skaleerimiseks Kafka tarbiagrupi viivituse alusel.
- **Arvutuse ja salvestuse eraldamine:** Salvestage kogu püsiolek objektsalvestusse (Iceberg S3-s), mitte arvutussõlmedesse. Arvutusklastrid saavad ülesannete vahel nulli skaleerida. See on lakehouse mustri põhiline kulueelis Hadoopi aegse arhitektuuri ees.
- **Kihistatud töötlus:** Mitte kõik sündmused ei vaja alla sekundi latentsust. Suunake kõrge prioriteediga sündmusetüübid läbi reaalajas Flink-i konveieri; suunake madalama prioriteediga sündmused mikro-pakkide ülesandesse (iga 5 minuti järel). Kuluvaheline erinevus on märkimisväärne.

> Organisatsioonid, kes ehitavad voogedastuse infrastruktuuri hästi, jagavad ühte omadust: nad instrumenteerivad esmalt ja optimeerivad pidevalt. Nad ei projekteeri kulude pärast — nad projekteerivad korrektsuse ja jälgitavuse pärast, seejärel kasutavad jälgitavuse andmeid teadlike kulubesluste tegemiseks. Ennatlik kuluoptimeerimine andmeinfrastruktuuris on see, kuidas saate hooldamatud konveierid, millele keegi ei usalda.

Kaasaegne andmekonveier ei ole skriptide järjestus. See on hajussüsteem samade operatiivsete nõuetega nagu iga tootmisteenus: SLO-d, töövihikud, valvevahetus ja intsidentide analüüsid. Meeskonnad, kes sellega nii suhtuvad, ehitavad infrastruktuuri, mis kasvab aastaid väärtuses. Meeskonnad, kes seda ei tee, kustutavad tulekahjusid igavesti.
