---
title: "Ölçeklenebilir Veri Hatları Oluşturmak: Olay Odaklı Mimari ve Modern Veri Yığını"
date: "2026-03-22"
author: "HyperCubeSphere Engineering"
tags: ["veri mühendisliği", "kafka", "flink", "akış işleme", "veri hatları"]
excerpt: "Toplu işleme ölüyor. Olay odaklı, akış öncelikli mimariler, kararlarını saniyeler içinde — saatler değil — veriye dayandırması gereken her kuruluş için mühendislik standardıdır. İşte nasıl inşa edileceği."
---

Bir şeyin gerçekleşmesiyle kuruluşunuzun bundan haberdar olması arasındaki fark, düşündüğünüzden daha fazlasına mal olmaktadır. Gece yarısı çalışan toplu hatlar, dünün kararlarını yönlendiren bayat veriler üretir. Sahtekarlık tespitinde bu bir mali kayıptır. Operasyonel istihbaratta, önlemediniz bir arızadır. Müşteri deneyiminde, çok geç harekete geçtiğiniz bir kayıp sinyalidir.

Bu yazı, olay odaklı veri mimarisine pratik bir derinlemesine bakış sunuyor: ne zaman akış yapılacağını, ne zaman toplu işleme yapılacağını, gerçek üretim ortamını kaldıran Kafka hatlarını nasıl oluşturacağınızı, Flink'i ölçekte nasıl çalıştıracağınızı ve tüm bunları dürüst tutan gözlemlenebilirlik katmanını nasıl inşa edeceğinizi ele alıyor.

---

## Toplu, Akış veya Hibrit: Doğru Deseni Seçmek

Toplu ve akış işleme arasındaki karar dogmatik bir mesele değildir. Gecikme gereksinimleri, veri özellikleri ve operasyonel karmaşıklık bütçeleri tarafından yönlendirilen bir mühendislik dengesidir.

### Toplu İşlemenin Hâlâ Doğru Yanıt Olduğu Durumlar

Toplu işleme oluşturması, hata ayıklaması ve yeniden işlemesi daha basittir. Tazelik gereksinimlerinin saat veya gün cinsinden ölçüldüğü kullanım durumları için toplu işleme çoğu zaman doğru tercihdir:

- **Tarihsel analitik ve raporlama** — Aylık finansal raporlar, üç aylık iş değerlendirmeleri, uyumluluk raporları. Veri doğası gereği belirli bir zamana ait anlık görüntüdür. Bir depoya toplu ETL uygundur.
- **Model eğitimi** — Çoğu ML eğitim hattı doğası gereği toplu işleme ile çalışır. Akış verileri üzerinde eğitim, yalnızca model saatten kısa bir tazelik gerektiriyorsa sınırlı bir fayda sunan önemli karmaşıklık katar.
- **Yoğun dönüşümler** — Büyük veri kümelerinde karmaşık birleştirmeler (milyarlarca satır), join anahtarları temiz biçimde sıralanmamışsa akış işlemcilerinden daha verimli biçimde MPP sorgu motorları (BigQuery, Snowflake, Redshift) tarafından işlenir.

### Akışın Gerekli Olduğu Durumlar

Akış işleme şu durumlarda doğru desendir:

- **Gecikme gereksinimleri dakikanın altında** — Sahtekarlık puanlaması, gerçek zamanlı kişiselleştirme, operasyonel uyarılar, canlı gösterge panelleri. Toplu hatlar bu SLA'ları karşılayamaz.
- **Veri sürekli geliyor ve üzerine hareket edilmesi gerekiyor** — IoT telemetrisi, tıklatma akışı, finansal fiyat tikleri, uygulama olayları. Bu verileri toplu işleme için arabelleğe almak, en fazla sinyal içeren olaylar arasındaki zamansal ilişkileri atmak anlamına gelir.
- **Olay odaklı mikro hizmetler** — Olaylara tepki veren hizmetler (sipariş verildi → karşılamayı tetikle → depoya bildir), mimari olarak akış tabanlıdır. Bunları toplu süreçler olarak ele almak gecikme ve bağlaşım getirir.

### Hibrit (Lambda/Kappa) Mimari

Pek çok üretim sistemi her ikisine de ihtiyaç duyar. Lambda mimarisi (Nathan Marz tarafından yaygınlaştırılmış), gerçek zamanlı sonuçlar için bir akış katmanı ve doğru tarihsel yeniden hesaplama için bir toplu katman çalıştırır; sorgulara birleştirilmiş bir görünümden hizmet verir. Kappa mimarisi, bunu yalnızca akış katmanını kullanarak basitleştirir; değişmez olay günlüklerinden yeniden işleme yeteneğiyle.

**Kappa deseni, modern yığınlarda büyük ölçüde galip gelmiştir.** Nedeni: eşdeğer sonuçlar üretmesi gereken iki ayrı işleme kod tabanının (toplu ve akış) sürdürülmesi operasyonel olarak acımasızdır. Kafka'nın sonsuz saklama (katmanlı depolama aracılığıyla) özelliği ve Flink gibi bir akış işlemcisi, aynı kod tabanından hem gerçek zamanlı işlemeyi hem de tarihsel yeniden işlemeyi kaldırabilir.

---

## Kafka Mimarisi: Temel

Apache Kafka, kurumsal ölçekte olay akışı altyapısı için fiili standarttır. Güvenilir hatlar oluşturmak için dahili yapıyı anlamak şarttır.

### Temel Kavramlar

- **Konular**, yalnızca ekleme yapılan, sıralı, değiştirilemez günlüklerdir. Olaylar hiçbir zaman yerinde güncellenmez; yeni olaylar her zaman eklenir. Bu, Kafka'yı güvenilir ve ölçeklenebilir kılan temel tasarım tercihidir.
- **Bölümler**, paralelliğin birimidir. 12 bölümlü bir konu, bir tüketici grubu içinde 12'ye kadar tüketici tarafından paralel biçimde tüketilebilir. Bölüm sayısı, konu oluşturma sırasında alınan kapasite planlama kararıdır — fazla bölümlemenin maliyeti (daha fazla dosya tanımlayıcısı, daha fazla çoğaltma yükü), az bölümlemenin ise iş hacmini sınırladığı unutulmamalıdır.
- **Tüketici grupları**, birden fazla bağımsız uygulamanın aynı konuyu tüketmesine olanak tanır. Kafka, her tüketici grubunun ofsetini bağımsız olarak izler. Sahtekarlık tespit sisteminiz ve analitik hattınız, birbirine karışmadan aynı ödemeler konusunu tüketebilir.
- **Çoğaltma**, hata toleransı sağlar. 3 çoğaltma faktörü, her mesajın 3 aracıya yazıldığı anlamına gelir. `min.insync.replicas=2`, bir yazmanın yalnızca 2 çoğaltma onayladıktan sonra onaylanmasını sağlar — ayarlanacak dayanıklılık/gecikme dengesi budur.

### Üretici: Olayları Güvenilir Biçimde Yazmak

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

### Tüketici: Eşbağımlılıkla En Az Bir Kez İşleme

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

Buradaki kritik tasarım kısıtı: **işleme fonksiyonunuz eşbağımlı olmalıdır.** En az bir kez teslim, aynı mesajı zaman zaman iki kez işleyeceğiniz anlamına gelir — tüketici yeniden başlatılırken, yeniden dengeleme sırasında veya bir işleme hatası sonrasında. Durum deponuzda olayın doğal eşbağımlılık anahtarını (genellikle `event_id`) ve kontrol-sonra-ekle desenlerini kullanın.

---

## Apache Flink: Ölçekte Akış İşleme

Kafka olay taşımayı yönetir. Flink, bu olay akışları üzerinde durumlu hesaplamayı yönetir: pencereleme toplamları, zenginleştirme birleştirmeleri, CEP (Karmaşık Olay İşleme) ve tam olarak bir kez gerçekleşen durumlu dönüşümler.

### Bir Flink İş İskeleti: Sahtekarlık Sinyal Toplamı

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

### Flink Operasyonel Değerlendirmeleri

**Denetim noktası her şeydir.** Flink'in tam olarak bir kez gerçekleşen garantileri, dayanıklı depolama (S3, GCS, HDFS) için tutarlı denetim noktalarına bağlıdır. Denetim noktası sürekli başarısız olursa işiniz en az bir kez veya daha kötü şekilde çalışıyor demektir. Denetim noktası süresini ve başarısızlıklarını birinci sınıf SLI'lar olarak izleyin.

**Durum arka ucu seçimi:**
- `HashMapStateBackend` (bellek içi) — hızlı, ancak durum, görev yöneticisi başarısızlığında kaybolur ve durum boyutunu heap boyutuyla sınırlar. Durumsuz veya düşük durumlu işler için kabul edilebilir.
- `EmbeddedRocksDBStateBackend` — yerel disk üzerinde durum ve uzak depolamaya denetim noktası. Büyük durum için gereklidir (arama tablolarına karşı birleştirmeler, uzun pencere toplamları). Bellek içinden daha yüksek gecikme, ancak üretim iş yükleri için zorunludur.

**Filigran ayarı:** Filigran stratejiniz, Flink'in bir pencereyi kapatmadan önce geç olayları ne kadar bekleyeceğini belirler. Çok agresif (kısa gecikme) olursa geç olayları düşürürsünüz. Çok muhafazakâr (uzun gecikme) olursa uçtan uca gecikmeyi artırırsınız. Olay zaman dağılımınızın profilini çıkarın ve gecikmeyi maksimum değil, olay gecikmesinin 99. yüzde dilimine göre ayarlayın.

---

## Şema Evrimi: Hat Kırılmalarını Önlemek

Şemalar değişir. `payments.events.v2` üreten hizmet, er ya da geç bir alan eklemesi, bir alanı yeniden adlandırması veya bir türü değiştirmesi gerekecektir. Bir şema yönetim stratejisi olmadan, şema değişiklikleri üretimdeki aşağı akış tüketicilerini kırar.

**Confluent Schema Registry**, Avro, Protobuf ve JSON Şeması için standart çözümdür. Her şema sürümü kaydedilir ve bir uyumluluk moduna karşı doğrulanır:

- **Geriye dönük uyumluluk** — Yeni şema, eski şema tarafından yazılan verileri okuyabilir. Yeni tüketiciler eski mesajları okuyabilir. İsteğe bağlı alanlar eklemek için güvenlidir.
- **İleriye dönük uyumluluk** — Eski şema, yeni şema tarafından yazılan verileri okuyabilir. Eski tüketiciler yeni mesajları okuyabilir. İsteğe bağlı alanları kaldırmak için güvenlidir.
- **Tam uyumluluk** — Hem geriye dönük hem de ileriye dönük. En kısıtlayıcı, ancak uzun süreli tüketici grupları için en güvenlisi.

Operasyonel kural: **Üretimde `FULL_TRANSITIVE` uyumluluğu zorunlu kılın.** Eski üreticileri veya eski tüketicileri kıracak herhangi bir şema değişikliği, çok adımlı bir geçişten geçmelidir:

1. Yeni alanı varsayılan değerle isteğe bağlı olarak ekleyin (geriye dönük uyumlu)
2. Yeni alanı işlemek için tüm tüketicileri dağıtın
3. Yeni alanı doldurmak için üreticileri dağıtın
4. Eski alanı kullanımdan kaldırılmış olarak işaretleyin
5. Tüm tüketiciler güncellendikten sonra eski alanı sonraki sürümde kaldırın

Tek bir dağıtımda hiçbir zaman zorunlu bir alanı kaldırmayın, bir alanı yeniden adlandırmayın veya alan türünü değiştirmeyin.

---

## Değişiklik Verisi Yakalama (CDC): Veritabanlarından Akış

Pek çok olay odaklı mimari, uygulama kodunu değiştirmeden mevcut ilişkisel veritabanlarındaki değişiklikleri Kafka'ya aktarmaya ihtiyaç duyar. Değişiklik Verisi Yakalama, veritabanının işlem günlüğünü okur ve satır düzeyindeki değişiklikleri olaylar olarak yayınlar.

**Debezium**, standart açık kaynak CDC platformudur. PostgreSQL (mantıksal çoğaltma), MySQL (binlog), Oracle (LogMiner) ve SQL Server (CDC) destekler. Kafka Connect'te dağıtılan bir Debezium bağlayıcısı, işlem günlüğünü okur ve `INSERT`, `UPDATE` ve `DELETE` olaylarını Kafka konularına yayınlar.

Debezium CDC için temel operasyonel değerlendirmeler:
- Güncellemelerde tam önce/sonra satır görüntüleri istediğiniz PostgreSQL tablolarında `REPLICA IDENTITY FULL` özelliğini etkinleştirin (varsayılan, önceki görüntüde yalnızca birincil anahtarı içerir)
- Bağlayıcı geride kalırsa çoğaltma yuvaları WAL biriktirir — yuva gecikmesini agresif biçimde izleyin; kontrolsüz büyüme diski doldurabilir ve PostgreSQL'i çökertebilir
- Büyük tabloların ilk anlık görüntüsü saatler alabilir ve önemli veritabanı yükü oluşturabilir — düşük trafikli dönemlerde planlayın

---

## Veri Göl Evi ve dbt Dönüşümleri

Modern veri yığını, **göl evi deseni** üzerinde birleşmektedir: nesne depolama üzerindeki açık tablo biçimleri (Apache Iceberg, Delta Lake), ACID işlemleri, zaman yolculuğu ve şema evrimi sağlar; sorgu motorları (Trino, Spark, Snowflake) ve bir hesaplama katmanı tarafından sunulur.

Akış işleme çıktıları doğrudan Iceberg tablolarına gider. dbt, analitik kullanım durumları için üzerinde dönüşüm modelleri çalıştırır:

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

## Hat Gözlemlenebilirliği: Vazgeçilmez Katman

Gözlemlenebilirliği olmayan bir veri hattı bir yükümlülüktür. Biri bayat gösterge panellerinden veya kaçırılan SLA'lardan şikâyet edene kadar bozulduğunu bilmezsiniz. Veri hatları için gözlemlenebilirlik katmanı dört boyutu kapsar:

**Tazelik:** Veri zamanında geliyor mu? Konu başına SLO'lar tanımlayın (örn. ödemeler konusu son 60 saniye içinde olay içermeli). En son olay zaman damgası SLO eşiğini aştığında uyarı verin.

**Hacim:** Veri hacmi beklenen sınırlar içinde mi? Ani düşüşler yukarı akış arızalarını veya kesintileri gösterir. Ani artışlar, yukarı akıştaki veri kalitesi sorunlarını veya olayları gösterir. Hacim uyarıları için statik eşikler yerine istatistiksel süreç kontrolü (hareketli ortalama ve standart sapma bantları) kullanın.

**Şema:** Olaylar kayıtlı şemaya uyuyor mu? Konu başına şema doğrulama başarısızlık oranlarını izleyin. Şema başarısızlıklarında ani artış, bir üreticinin bozucu bir değişiklik dağıttığı anlamına gelir.

**Uçtan uca gecikme:** Olay oluşturulmasından sunma katmanında kullanıma sunulmasına kadar ne kadar sürer? Olaya yerleştirilmiş olay oluşturma zaman damgasıyla enstrümante edin ve hattın her aşamasında ölçün. Hat aşaması başına P50/P95/P99 gecikme.

Araçlar: Enstrümantasyon için **OpenTelemetry**, metrikler için **Prometheus ve Grafana**, veri kökenler için **Apache Atlas** veya **OpenMetadata**. Hatta gömülü veri kalite doğrulamaları için Great Expectations veya Soda.

---

## Maliyet Optimizasyonu

Kontrol altında tutulmazsa akış altyapısı pahalıdır. En büyük maliyet kaldıraçları:

- **Kafka saklama:** Verileri Kafka'da tüketici grubu kurtarması için gerekenden (genellikle 72 saat yeterlidir) daha uzun tutmayın. Uzun süreli saklama, oynatma için gerekiyorsa eski segmentleri dramatik biçimde daha düşük maliyetle nesne depolamaya taşımak için Kafka katmanlı depolamayı kullanın.
- **Flink paralelliği:** Fazla sağlanan Flink görev yöneticileri yaygın bir israftır. Kafka tüketici grubu gecikmesine göre paralelliği ölçeklendirmek için Flink'in otomatik ölçeklendirmesini (özel metriklerde Kubernetes HPA veya Kubernetes operatöründe Flink'te yönetilen otomatik ölçeklendirme) kullanın.
- **İşlem-depolama ayrımı:** Tüm kalıcı durumu işlem düğümlerinde değil, nesne depolamada (S3 üzerinde Iceberg) depolayın. İşlem kümeleri, işler arasında sıfıra ölçeklenebilir. Bu, göl evi deseninin Hadoop dönemindeki mimarilere karşı temel maliyet avantajıdır.
- **Katmanlı işleme:** Tüm olaylar saniyenin altında gecikme gerektirmez. Yüksek öncelikli olay türlerini gerçek zamanlı Flink hattından geçirin; daha düşük öncelikli olayları mikro toplu bir işe yönlendirin (her 5 dakikada bir). Maliyet farkı önemlidir.

> İyi akış altyapısı kuran kuruluşlar bir özelliği paylaşır: önce enstrümante eder ve sürekli optimize ederler. Maliyet için tasarlamazlar — doğruluk ve gözlemlenebilirlik için tasarlarlar, ardından gözlemlenebilirlik verilerini bilinçli maliyet kararları almak için kullanırlar. Veri altyapısında erken maliyet optimizasyonu, kimsenin güvenmediği bakımı yapılamaz hatların ortaya çıkma biçimidir.

Modern veri hattı bir komut dosyaları dizisi değildir. SLO'lar, runbook'lar, nöbet rotasyonları ve olay sonrası incelemeler gibi aynı operasyonel gereksinimlerle birlikte, herhangi bir üretim hizmetiyle aynı niteliklere sahip dağıtılmış bir sistemdir. Bu şekilde davranan ekipler, yıllar içinde değer biriktiren altyapı inşa eder. Bu şekilde davranmayanlar, sürekli yangın söndürmektedir.
