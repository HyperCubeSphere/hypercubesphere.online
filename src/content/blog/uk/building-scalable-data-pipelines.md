---
title: "Побудова масштабованих конвеєрів даних: подієво-орієнтована архітектура та сучасний стек даних"
date: "2026-03-22"
author: "HyperCubeSphere Engineering"
tags: ["інженерія даних", "kafka", "flink", "потокова обробка", "конвеєри даних"]
excerpt: "Пакетна обробка відмирає. Подієво-орієнтовані, потокові архітектури є інженерним стандартом для будь-якої організації, якій потрібні дані для прийняття рішень за секунди, а не за години. Ось як їх будувати."
---

Розрив між моментом, коли щось відбувається, та моментом, коли ваша організація дізнається про це, коштує вам більше, ніж ви думаєте. Пакетні конвеєри, що запускаються опівночі, виробляють застарілі дані, які управляють учорашніми рішеннями. У виявленні шахрайства це фінансові втрати. В операційній розвідці це збій, якого ви не запобігли. В клієнтському досвіді це сигнал відтоку, на який ви відреагували запізно.

Ця стаття є практичним заглибленням у подієво-орієнтовану архітектуру даних: коли потоково обробляти, коли пакетно, як будувати конвеєри Kafka, що виживають у виробничому середовищі, як запускати Flink у масштабі та як будувати рівень спостережуваності, який тримає все це під контролем.

---

## Пакетна vs. потокова vs. гібридна обробка: вибір правильного шаблону

Рішення між пакетною та потоковою обробкою — це не релігійне. Це інженерний компроміс, зумовлений вимогами до затримки, характеристиками даних та бюджетом операційної складності.

### Коли пакетна обробка є правильною відповіддю

Пакетна обробка простіша в побудові, налагодженні та перепроцесуванні. Для випадків використання, де вимоги до свіжості вимірюються годинами або днями, пакетна обробка часто є правильним вибором:

- **Історична аналітика та звітність** — Щомісячні фінансові звіти, квартальні бізнес-огляди, звіти відповідності. Дані є по суті точковими. Пакетний ETL у сховище є доречним.
- **Навчання моделей** — Більшість конвеєрів навчання ML є пакетними за своєю природою. Навчання на потокових даних вимагає спеціалізованої інфраструктури (онлайн-навчання, інкрементальне навчання), що додає значну складність з обмеженою перевагою, якщо модель не потребує свіжості менше години.
- **Складні трансформації** — Складні об'єднання великих наборів даних (мільярди рядків) часто ефективніше обробляються MPP-движками запитів (BigQuery, Snowflake, Redshift), ніж потоковими процесорами, особливо якщо ключі об'єднання не впорядковані чітко.

### Коли потокова обробка є необхідною

Потокова обробка є правильним шаблоном, коли:

- **Вимоги до затримки — менше хвилини** — Оцінка шахрайства, персоналізація в реальному часі, операційні сповіщення, живі інформаційні панелі. Пакетні конвеєри не можуть дотримуватися цих SLA.
- **Дані надходять безперервно і повинні бути оброблені** — IoT-телеметрія, потоки кліків, фінансові тіки, події програм. Буферизація цих даних для пакетної обробки означає відкидання часових відносин між подіями, що містять найбільше сигналу.
- **Мікросервіси, керовані подіями** — Сервіси, що реагують на події (замовлення оформлено → запуск виконання → сповіщення складу), архітектурно є потоковими. Трактування їх як пакетних процесів вводить затримку та зв'язування.

### Гібридна (Lambda/Kappa) архітектура

Багато виробничих систем потребують обох. Lambda-архітектура (популяризована Натаном Марцом) запускає потоковий рівень для результатів у реальному часі та пакетний рівень для точного історичного перерахунку, обслуговуючи запити з об'єднаного подання. Kappa-архітектура спрощує це, використовуючи лише потоковий рівень із можливістю перепроцесування з незмінних журналів подій.

**Шаблон Kappa в основному переміг** у сучасних стеках. Причина: підтримка двох окремих кодових баз обробки (пакетної та потокової), які повинні давати еквівалентні результати, є операційно жорстокою. Нескінченне зберігання Kafka (через багаторівневе сховище) плюс потоковий процесор типу Flink може обробляти як обробку в реальному часі, так і перепроцесування з однієї кодової бази.

---

## Архітектура Kafka: фундамент

Apache Kafka є стандартом де-факто для інфраструктури потокової передачі подій у корпоративному масштабі. Розуміння внутрішньої будови є необхідним для побудови надійних конвеєрів.

### Основні концепції

- **Теми** — журнали, що лише додаються, впорядковані та незмінні. Події ніколи не оновлюються на місці; нові події завжди додаються. Це фундаментальне проектне рішення робить Kafka надійним та масштабованим.
- **Розділи** — одиниця паралелізму. Тема з 12 розділами може споживатися до 12 споживачів паралельно в групі споживачів. Кількість розділів — це рішення щодо планування потужності, що приймається під час створення теми.
- **Групи споживачів** дозволяють кільком незалежним програмам споживати одну тему. Kafka відслідковує зміщення кожної групи споживачів незалежно. Система виявлення шахрайства та конвеєр аналітики можуть обидва споживати одну тему платежів, не заважаючи один одному.
- **Реплікація** забезпечує відмовостійкість. Коефіцієнт реплікації 3 означає, що кожне повідомлення записується на 3 брокери. `min.insync.replicas=2` гарантує, що запис підтверджується лише після підтвердження 2 реплік — компроміс між довговічністю та затримкою для налаштування.

### Продюсер: надійний запис подій

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

### Споживач: обробка «принаймні один раз» з ідемпотентністю

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

Ключове проектне обмеження тут: **ваша функція обробки повинна бути ідемпотентною.** Доставка «принаймні один раз» означає, що іноді ви будете обробляти одне й те саме повідомлення двічі. Використовуйте природний ключ ідемпотентності події (зазвичай `event_id`) та шаблони «перевір, потім вставив» у вашому сховищі стану.

---

## Apache Flink: потокова обробка у масштабі

Kafka обробляє транспортування подій. Flink обробляє stateful-обчислення на потоках подій: агрегації у вікнах, збагачуючі об'єднання, CEP (Complex Event Processing) та stateful-трансформації «рівно один раз».

### Скелет завдання Flink: агрегація сигналів шахрайства

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

### Операційні аспекти Flink

**Контрольні точки — це все.** Гарантії «рівно один раз» у Flink залежать від послідовних контрольних точок у довготривале сховище (S3, GCS, HDFS). Якщо контрольні точки постійно зазнають невдачі, ваше завдання виконується «принаймні один раз» або гірше. Відстежуйте тривалість та збої контрольних точок як SLI першого класу.

**Вибір бекенду стану:**
- `HashMapStateBackend` (в пам'яті) — швидкий, але стан втрачається при відмові task manager і обмежує розмір стану розміром heap. Прийнятний для завдань без стану або з малим станом.
- `EmbeddedRocksDBStateBackend` — стан на локальному диску + контрольні точки у віддаленому сховищі. Необхідний для великого стану (об'єднання з таблицями пошуку, агрегації у довгих вікнах). Вища затримка, ніж в пам'яті, але необхідний для виробничих навантажень.

**Налаштування водяних знаків:** ваша стратегія водяних знаків визначає, як довго Flink чекає запізнілих подій перед закриттям вікна. Надто агресивний (короткий запас) — і ви відкидаєте запізнілі події. Надто консервативний (довгий запас) — і ви збільшуєте наскрізну затримку. Проаналізуйте розподіл часу подій і встановіть запас на рівні 99-го перцентиля затримки подій, а не максимуму.

---

## Еволюція схем: уникнення поломок конвеєра

Схеми змінюються. Сервіс, що виробляє `payments.events.v2`, врешті-решт матиме потребу додати поле, перейменувати поле або змінити тип. Без стратегії управління схемами зміни схем ламають споживачів нижче за потоком у виробництві.

**Confluent Schema Registry** є стандартним рішенням для Avro, Protobuf та JSON Schema. Кожна версія схеми реєструється та перевіряється на відповідність режиму сумісності:

- **Зворотна сумісність** — Нова схема може читати дані, написані старою схемою. Нові споживачі можуть читати старі повідомлення. Безпечна для додавання необов'язкових полів.
- **Пряма сумісність** — Стара схема може читати дані, написані новою схемою. Старі споживачі можуть читати нові повідомлення. Безпечна для видалення необов'язкових полів.
- **Повна сумісність** — Обидві: зворотна та пряма. Найбільш обмежувальна, але найбезпечніша для тривалих груп споживачів.

Операційне правило: **застосовуйте сумісність `FULL_TRANSITIVE` у виробництві.** Будь-яка зміна схеми, що могла б зламати старих продюсерів або старих споживачів, повинна пройти через багатоетапну міграцію:

1. Додайте нове поле як необов'язкове зі значенням за замовчуванням (зворотна сумісність)
2. Розгорніть усіх споживачів для обробки нового поля
3. Розгорніть продюсерів для заповнення нового поля
4. Позначте старе поле як застаріле
5. Після оновлення всіх споживачів видаліть старе поле в наступному релізі

Ніколи не видаляйте обов'язкове поле, не перейменовуйте поле та не змінюйте тип поля в одному розгортанні.

---

## Change Data Capture (CDC): потокова передача з баз даних

Багато подієво-орієнтованих архітектур потребують передачі змін із існуючих реляційних баз даних у Kafka без зміни коду програми. CDC зчитує журнал транзакцій бази даних та публікує зміни на рівні рядків як події.

**Debezium** є стандартною відкритою платформою CDC. Він підтримує PostgreSQL (логічна реплікація), MySQL (binlog), Oracle (LogMiner) та SQL Server (CDC). Connector Debezium, розгорнутий у Kafka Connect, зчитує журнал транзакцій та публікує події `INSERT`, `UPDATE` та `DELETE` у теми Kafka.

Ключові операційні аспекти для Debezium CDC:
- Увімкніть `REPLICA IDENTITY FULL` для таблиць PostgreSQL, де ви хочете мати повні образи рядків до/після при оновленнях (за замовчуванням у зображенні «до» включено лише первинний ключ)
- Слоти реплікації накопичують WAL, якщо connector відстає — агресивно відстежуйте затримку слоту; неконтрольоване зростання може заповнити диск та призвести до збою PostgreSQL
- Початковий знімок великих таблиць може зайняти години та генерувати значне навантаження на базу даних — плануйте на часи низького трафіку

---

## Lakehouse даних та трансформації dbt

Сучасний стек даних конвергує до **шаблону lakehouse**: відкриті формати таблиць (Apache Iceberg, Delta Lake) на об'єктному сховищі забезпечують ACID-транзакції, подорожі в часі та еволюцію схем на рівні зберігання, що обслуговується рушіями запитів (Trino, Spark, Snowflake) та рівнем обчислень.

Виходи потокової обробки потрапляють безпосередньо до таблиць Iceberg. dbt запускає моделі трансформацій поверх для аналітичних випадків використання:

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

## Спостережуваність конвеєра: обов'язковий рівень

Конвеєр даних без спостережуваності є пасивом. Ви не дізнаєтесь, що він зламаний, поки хтось не поскаржиться на застарілі інформаційні панелі або порушені SLA. Рівень спостережуваності для конвеєрів даних охоплює чотири виміри:

**Свіжість:** Чи надходять дані вчасно? Визначте SLO для кожної теми (наприклад, тема платежів повинна мати події за останні 60 секунд). Сповіщайте, коли часова мітка останньої події перевищує поріг SLO.

**Обсяг:** Чи знаходиться обсяг даних у межах очікуваних значень? Раптове падіння вказує на збої або відключення вище за потоком. Раптові стрибки вказують на проблеми якості даних або інциденти вище за потоком. Використовуйте статистичний контроль процесів (рухома середня + смуги стандартного відхилення) замість статичних порогів для сповіщень про обсяг.

**Схема:** Чи відповідають події зареєстрованій схемі? Відстежуйте рівень збоїв перевірки схеми для кожної теми. Стрибок збоїв схеми означає, що продюсер розгорнув критичну зміну.

**Наскрізна затримка:** Скільки часу займає від створення події до доступності в сервісному рівні? Інструментуйте за допомогою часової мітки створення події, вбудованої в подію, та вимірюйте на кожному етапі конвеєра. Затримка P50/P95/P99 на кожному етапі конвеєра.

Інструментарій: **OpenTelemetry** для інструментування, **Prometheus + Grafana** для метрик, **Apache Atlas** або **OpenMetadata** для лінійності даних. Great Expectations або Soda для тверджень якості даних, вбудованих у конвеєр.

---

## Оптимізація витрат

Інфраструктура потокової передачі є дорогою, якщо її не контролювати. Найбільші важелі витрат:

- **Зберігання Kafka:** Не зберігайте дані в Kafka довше, ніж потрібно для відновлення групи споживачів (72 години зазвичай достатньо). Використовуйте багаторівневе сховище Kafka для переміщення старих сегментів на об'єктне сховище за значно нижчою вартістю, якщо потрібне тривале зберігання для відтворення.
- **Паралелізм Flink:** Надмірно забезпечені task manager Flink є поширеним марнотратством. Використовуйте автомасштабування Flink (Kubernetes HPA на власних метриках або кероване автомасштабування в операторі Flink для Kubernetes) для масштабування паралелізму на основі затримки групи споживачів Kafka.
- **Розподіл обчислень та сховища:** Зберігайте весь постійний стан в об'єктному сховищі (Iceberg на S3), а не у вузлах обчислень. Обчислювальні кластери можуть масштабуватися до нуля між завданнями. Це фундаментальна перевага витрат шаблону lakehouse над архітектурами епохи Hadoop.
- **Багаторівнева обробка:** Не всі події потребують затримки менше секунди. Направляйте події пріоритетних типів через конвеєр Flink у реальному часі; направляйте події нижчого пріоритету до мікропакетного завдання (кожні 5 хвилин). Різниця у витратах є значною.

> Організації, що добре будують потокову інфраструктуру, мають одну спільну рису: вони спочатку інструментують, а потім безперервно оптимізують. Вони не проектують для витрат — вони проектують для правильності та спостережуваності, а потім використовують дані спостережуваності для прийняття обґрунтованих рішень щодо витрат. Передчасна оптимізація витрат у інфраструктурі даних — ось як ви отримуєте непідтримувані конвеєри, яким ніхто не довіряє.

Сучасний конвеєр даних — це не послідовність скриптів. Це розподілена система з тими самими операційними вимогами, що й будь-який виробничий сервіс: SLO, посібники з усунення несправностей, чергування по виклику та постмортеми інцидентів. Команди, що ставляться до нього саме так, будують інфраструктуру, що зростає в цінності роками. Команди, що не роблять цього, вічно борються з пожежами.
