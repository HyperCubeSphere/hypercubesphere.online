---
title: "Construir pipelines de datos escalables: arquitectura orientada a eventos y la pila de datos moderna"
date: "2026-03-22"
author: "HyperCubeSphere Engineering"
tags: ["ingeniería de datos", "kafka", "flink", "procesamiento de flujos", "pipelines de datos"]
excerpt: "El procesamiento por lotes está desapareciendo. Las arquitecturas orientadas a eventos y centradas en streaming son el estándar de ingeniería para cualquier organización que necesita que los datos informen decisiones en segundos, no en horas. Así se construyen."
---

La brecha entre cuándo ocurre algo y cuándo su organización lo sabe le está costando más de lo que cree. Los pipelines por lotes que se ejecutan a medianoche producen datos obsoletos que impulsan las decisiones de ayer. En la detección de fraude, eso es una pérdida financiera. En la inteligencia operacional, es una interrupción que no se previno. En la experiencia del cliente, es una señal de abandono sobre la que se actuó demasiado tarde.

Este artículo es una inmersión práctica en la arquitectura de datos orientada a eventos: cuándo hacer streaming, cuándo hacer procesamiento por lotes, cómo construir pipelines de Kafka que realmente sobrevivan a la producción, cómo ejecutar Flink a escala y cómo construir la capa de observabilidad que mantiene todo esto honesto.

---

## Batch vs. Stream vs. Híbrido: elegir el patrón correcto

La decisión entre el procesamiento por lotes y el procesamiento en flujo no es una cuestión religiosa. Es una compensación de ingeniería impulsada por los requisitos de latencia, las características de los datos y los presupuestos de complejidad operacional.

### Cuándo el procesamiento por lotes sigue siendo la respuesta correcta

El procesamiento por lotes es más simple de construir, más simple de depurar y más simple de reprocesar. Para casos de uso donde los requisitos de actualización se miden en horas o días, el batch suele ser la elección correcta:

- **Análisis histórico e informes** — Informes financieros mensuales, revisiones de negocio trimestrales, informes de cumplimiento. Los datos son inherentemente puntuales. El ETL por lotes hacia un almacén de datos es apropiado.
- **Entrenamiento de modelos** — La mayoría de los pipelines de entrenamiento de ML son por naturaleza por lotes. Entrenar con datos de flujo requiere infraestructura especializada (aprendizaje en línea, entrenamiento incremental) que añade complejidad significativa con beneficio limitado, a menos que el modelo requiera una actualización inferior a la hora.
- **Transformaciones pesadas** — Las uniones complejas entre grandes conjuntos de datos (miles de millones de filas) a menudo son más eficientemente manejadas por motores de consulta MPP (BigQuery, Snowflake, Redshift) que por procesadores de flujo, especialmente si las claves de unión no están claramente ordenadas.

### Cuándo el streaming es necesario

El procesamiento en flujo es el patrón correcto cuando:

- **Los requisitos de latencia son inferiores a un minuto** — Puntuación de fraude, personalización en tiempo real, alertas operacionales, paneles en vivo. Los pipelines por lotes no pueden cumplir estos SLA.
- **Los datos llegan continuamente y deben procesarse** — Telemetría IoT, clickstream, ticks financieros, eventos de aplicación. Almacenar en búfer estos datos para el procesamiento por lotes significa descartar las relaciones temporales entre eventos que contienen la señal más fuerte.
- **Microservicios orientados a eventos** — Los servicios que reaccionan a eventos (pedido realizado → activar cumplimiento → notificar almacén) son arquitectónicamente de streaming. Tratarlos como procesos por lotes introduce latencia y acoplamiento.

### La arquitectura híbrida (Lambda/Kappa)

Muchos sistemas de producción necesitan ambos. La arquitectura Lambda (popularizada por Nathan Marz) ejecuta una capa de flujo para resultados en tiempo real y una capa por lotes para el recálculo histórico preciso, sirviendo consultas desde una vista fusionada. La arquitectura Kappa simplifica esto usando solo la capa de flujo, con la capacidad de reprocesar desde registros de eventos inmutables.

**El patrón Kappa ha prevalecido en gran medida** en las pilas modernas. La razón: mantener dos bases de código de procesamiento separadas (por lotes y flujo) que deben producir resultados equivalentes es operacionalmente brutal. La retención infinita de Kafka (mediante almacenamiento por niveles) más un procesador de flujo como Flink puede manejar tanto el procesamiento en tiempo real como el reprocesamiento histórico desde la misma base de código.

---

## Arquitectura Kafka: los cimientos

Apache Kafka es el estándar de facto para la infraestructura de streaming de eventos a escala empresarial. Comprender los mecanismos internos es esencial para construir pipelines confiables.

### Conceptos fundamentales

- Los **Topics** son registros de solo adjuntar, ordenados e inmutables. Los eventos nunca se actualizan en su lugar; los nuevos eventos siempre se adjuntan. Esta es la decisión de diseño fundamental que hace a Kafka confiable y escalable.
- Las **Particiones** son la unidad de paralelismo. Un topic con 12 particiones puede ser consumido por hasta 12 consumidores en paralelo dentro de un grupo de consumidores. El número de particiones es una decisión de planificación de capacidad que se toma al crear el topic — la sobre-partición tiene costes (más descriptores de archivos, más sobrecarga de replicación), la bajo-partición limita el rendimiento.
- Los **Grupos de consumidores** permiten que múltiples aplicaciones independientes consuman el mismo topic. Kafka rastrea el offset de cada grupo de consumidores de forma independiente. El sistema de detección de fraude y el pipeline de análisis pueden ambos consumir el mismo topic de pagos sin interferir.
- La **Replicación** proporciona tolerancia a fallos. Un factor de replicación de 3 significa que cada mensaje se escribe en 3 brokers. `min.insync.replicas=2` garantiza que una escritura solo se confirma después de que 2 réplicas la confirmen — la compensación durabilidad/latencia a ajustar.

### Productor: escribir eventos de forma confiable

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

### Consumidor: procesamiento al menos una vez con idempotencia

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

La restricción de diseño crítica aquí: **la función de procesamiento debe ser idempotente.** La entrega al menos una vez significa que ocasionalmente se procesará el mismo mensaje dos veces — al reiniciar el consumidor, rebalancear o después de un fallo de confirmación. Use la clave de idempotencia natural del evento (generalmente `event_id`) y los patrones verificar-luego-insertar en el almacén de estado.

---

## Apache Flink: procesamiento de flujos a escala

Kafka maneja el transporte de eventos. Flink maneja el cómputo con estado en esos flujos de eventos: agregaciones con ventanas, uniones de enriquecimiento, CEP (Complex Event Processing) y transformaciones con estado exactamente una vez.

### Esqueleto de un job de Flink: agregación de señales de fraude

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

### Consideraciones operacionales de Flink

**El checkpointing es fundamental.** Las garantías de exactamente una vez de Flink dependen de checkpoints consistentes hacia almacenamiento duradero (S3, GCS, HDFS). Si el checkpointing falla consistentemente, el job se ejecuta en modo al menos una vez o peor. Monitoree la duración y los fallos de checkpoint como SLI de primer orden.

**Selección del backend de estado:**
- `HashMapStateBackend` (en memoria) — rápido, pero el estado se pierde ante el fallo del task manager y limita el tamaño del estado al tamaño del heap. Aceptable para jobs sin estado o con poco estado.
- `EmbeddedRocksDBStateBackend` — estado en disco local + checkpoint en almacenamiento remoto. Necesario para estado grande (uniones contra tablas de búsqueda, agregaciones de ventanas largas). Mayor latencia que en memoria, pero necesario para cargas de trabajo de producción.

**Ajuste de watermarks:** La estrategia de watermark determina cuánto tiempo espera Flink por eventos tardíos antes de cerrar una ventana. Demasiado agresiva (retraso corto) y se pierden eventos tardíos. Demasiado conservadora (retraso largo) y se aumenta la latencia de extremo a extremo. Perfile la distribución de tiempo de evento y establezca el retraso en el percentil 99 del lag de eventos, no en el máximo.

---

## Evolución de esquema: evitar la ruptura del pipeline

Los esquemas cambian. El servicio que produce `payments.events.v2` eventualmente necesitará añadir un campo, renombrar un campo o cambiar un tipo. Sin una estrategia de gestión de esquemas, los cambios de esquema rompen a los consumidores posteriores en producción.

**Confluent Schema Registry** es la solución estándar para Avro, Protobuf y JSON Schema. Cada versión de esquema se registra y valida contra un modo de compatibilidad:

- **Compatibilidad hacia atrás** — El nuevo esquema puede leer datos escritos por el esquema antiguo. Los nuevos consumidores pueden leer mensajes antiguos. Seguro para añadir campos opcionales.
- **Compatibilidad hacia adelante** — El esquema antiguo puede leer datos escritos por el nuevo esquema. Los consumidores antiguos pueden leer mensajes nuevos. Seguro para eliminar campos opcionales.
- **Compatibilidad completa** — Tanto hacia atrás como hacia adelante. La más restrictiva pero la más segura para grupos de consumidores de larga duración.

La regla operacional: **aplique la compatibilidad `FULL_TRANSITIVE` en producción.** Cualquier cambio de esquema que rompa a los productores antiguos o a los consumidores antiguos debe pasar por una migración de múltiples pasos:

1. Añadir el nuevo campo como opcional con un valor predeterminado (compatible hacia atrás)
2. Desplegar todos los consumidores para manejar el nuevo campo
3. Desplegar los productores para rellenar el nuevo campo
4. Marcar el campo antiguo como obsoleto
5. Después de que todos los consumidores estén actualizados, eliminar el campo antiguo en una versión posterior

Nunca elimine un campo requerido, renombre un campo o cambie el tipo de un campo en un único despliegue.

---

## Change Data Capture (CDC): streaming desde bases de datos

Muchas arquitecturas orientadas a eventos necesitan transmitir cambios desde bases de datos relacionales existentes hacia Kafka sin modificar el código de la aplicación. El CDC lee el registro de transacciones de la base de datos y publica cambios a nivel de fila como eventos.

**Debezium** es la plataforma CDC de código abierto estándar. Admite PostgreSQL (replicación lógica), MySQL (binlog), Oracle (LogMiner) y SQL Server (CDC). Un conector Debezium desplegado en Kafka Connect lee el registro de transacciones y publica eventos `INSERT`, `UPDATE` y `DELETE` en topics de Kafka.

Consideraciones operacionales clave para Debezium CDC:
- Active `REPLICA IDENTITY FULL` en las tablas de PostgreSQL para las que desee imágenes completas antes/después en las actualizaciones (por defecto solo se incluye la clave primaria en la imagen anterior)
- Las ranuras de replicación acumulan WAL si el conector se retrasa — monitoree agresivamente el lag de la ranura; el crecimiento descontrolado puede llenar el disco y hacer caer PostgreSQL
- La instantánea inicial de tablas grandes puede tardar horas y generar una carga significativa en la base de datos — planifique durante períodos de bajo tráfico

---

## Data Lakehouse y transformaciones dbt

La pila de datos moderna converge en el **patrón lakehouse**: los formatos de tabla abiertos (Apache Iceberg, Delta Lake) en almacenamiento de objetos proporcionan transacciones ACID, viaje en el tiempo y evolución de esquemas en la capa de almacenamiento, servidos por motores de consulta (Trino, Spark, Snowflake) y una capa de cómputo.

Las salidas del procesamiento en flujo aterrizan directamente en tablas de Iceberg. dbt ejecuta modelos de transformación encima para casos de uso analíticos:

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

## Observabilidad del pipeline: la capa innegociable

Un pipeline de datos sin observabilidad es un pasivo. No se sabrá que está roto hasta que alguien se queje de paneles obsoletos o SLA incumplidos. La capa de observabilidad para pipelines de datos cubre cuatro dimensiones:

**Frescura:** ¿Los datos llegan a tiempo? Defina SLO por topic (por ejemplo, el topic de pagos debe tener eventos en los últimos 60 segundos). Alerte cuando la marca de tiempo del último evento exceda el umbral del SLO.

**Volumen:** ¿El volumen de datos está dentro de los límites esperados? Las caídas repentinas indican fallos o interrupciones en el origen. Los picos repentinos indican problemas de calidad de datos o incidentes en el origen. Use control estadístico de procesos (media móvil + bandas de desviación estándar) en lugar de umbrales estáticos para las alertas de volumen.

**Esquema:** ¿Los eventos se conforman al esquema registrado? Rastree las tasas de fallos de validación de esquema por topic. Un pico en los fallos de esquema significa que un productor desplegó un cambio incompatible.

**Latencia de extremo a extremo:** ¿Cuánto tiempo tarda desde la creación del evento hasta que está disponible en la capa de servicio? Instrumente con la marca de tiempo de creación del evento integrada en el evento, y mida en cada etapa del pipeline. Latencia P50/P95/P99 por etapa del pipeline.

Herramientas: **OpenTelemetry** para instrumentación, **Prometheus + Grafana** para métricas, **Apache Atlas** u **OpenMetadata** para el linaje de datos. Great Expectations o Soda para aserciones de calidad de datos integradas en el pipeline.

---

## Optimización de costes

La infraestructura de streaming es costosa si no se controla. Los mayores factores de coste:

- **Retención de Kafka:** No retenga datos en Kafka más tiempo del necesario para la recuperación de grupos de consumidores (72 horas suele ser suficiente). Use el almacenamiento por niveles de Kafka para mover segmentos más antiguos al almacenamiento de objetos a un coste significativamente menor si se requiere una retención larga para la reproducción.
- **Paralelismo de Flink:** Los task managers de Flink sobredimensionados son un desperdicio común. Use el autoescalado de Flink (Kubernetes HPA en métricas personalizadas, o autoescalado gestionado en el operador Flink on Kubernetes) para escalar el paralelismo basado en el lag del grupo de consumidores de Kafka.
- **Separación cómputo-almacenamiento:** Almacene todo el estado persistente en almacenamiento de objetos (Iceberg en S3), no en nodos de cómputo. Los clústeres de cómputo pueden escalar a cero entre jobs. Esta es la ventaja de coste fundamental del patrón lakehouse sobre las arquitecturas de la era Hadoop.
- **Procesamiento por niveles:** No todos los eventos necesitan latencia sub-segundo. Enrute los tipos de eventos de alta prioridad a través del pipeline de Flink en tiempo real; enrute los eventos de menor prioridad hacia un job de micro-batch (cada 5 minutos). La diferencia de coste es significativa.

> Las organizaciones que construyen bien la infraestructura de streaming comparten un rasgo: instrumentan primero y optimizan continuamente. No diseñan para el coste — diseñan para la corrección y la observabilidad, y luego usan los datos de observabilidad para tomar decisiones de coste informadas. La optimización prematura de costes en la infraestructura de datos es cómo se acaba con pipelines imposibles de mantener en los que nadie confía.

El pipeline de datos moderno no es una secuencia de scripts. Es un sistema distribuido con los mismos requisitos operacionales que cualquier servicio de producción: SLO, runbooks, rotaciones de guardia e informes post-incidente. Los equipos que lo tratan así construyen infraestructura que acumula valor con el paso de los años. Los que no lo hacen están perpetuamente apagando incendios.
