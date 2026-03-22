---
title: "Construire des pipelines de données évolutifs : architecture événementielle et pile de données moderne"
date: "2026-03-22"
author: "HyperCubeSphere Engineering"
tags: ["ingénierie des données", "kafka", "flink", "traitement de flux", "pipelines de données"]
excerpt: "Le traitement par lots est en déclin. Les architectures événementielles et orientées streaming sont le standard d'ingénierie pour toute organisation qui a besoin que les données éclairent les décisions en secondes, pas en heures. Voici comment les construire."
---

L'écart entre le moment où quelque chose se produit et le moment où votre organisation en est informée vous coûte plus que vous ne le pensez. Les pipelines batch qui s'exécutent à minuit produisent des données périmées qui orientent les décisions d'hier. En détection de fraude, c'est une perte financière. En intelligence opérationnelle, c'est une panne que vous n'avez pas prévenue. En expérience client, c'est un signal de désabonnement sur lequel vous avez agi trop tard.

Cet article est une plongée pratique dans l'architecture de données événementielle : quand streamer, quand traiter par lots, comment construire des pipelines Kafka qui survivent réellement à la production, comment exécuter Flink à l'échelle, et comment construire la couche d'observabilité qui maintient tout cela honnête.

---

## Batch vs. Stream vs. Hybride : choisir le bon modèle

Le choix entre le traitement par lots et le traitement en flux n'est pas une question religieuse. C'est un compromis d'ingénierie piloté par les exigences de latence, les caractéristiques des données et les budgets de complexité opérationnelle.

### Quand le batch est encore la bonne réponse

Le traitement par lots est plus simple à construire, plus simple à déboguer et plus simple à retraiter. Pour les cas d'usage où les exigences de fraîcheur se mesurent en heures ou en jours, le batch est souvent le bon choix :

- **Analytique historique et reporting** — Rapports financiers mensuels, bilans trimestriels, rapports de conformité. Les données sont intrinsèquement ponctuelles. L'ETL batch vers un entrepôt de données est approprié.
- **Entraînement de modèles** — La plupart des pipelines d'entraînement ML sont naturellement batch. L'entraînement sur des données en flux nécessite une infrastructure spécialisée (apprentissage en ligne, entraînement incrémental) qui ajoute une complexité significative avec un bénéfice limité sauf si le modèle requiert une fraîcheur inférieure à l'heure.
- **Transformations lourdes** — Les jointures complexes sur de grands ensembles de données (des milliards de lignes) sont souvent plus efficacement gérées par des moteurs de requêtes MPP (BigQuery, Snowflake, Redshift) que par des processeurs de flux, surtout si les clés de jointure ne sont pas clairement ordonnées.

### Quand le streaming est nécessaire

Le traitement en flux est le bon modèle quand :

- **Les exigences de latence sont inférieures à la minute** — Notation de fraude, personnalisation en temps réel, alertes opérationnelles, tableaux de bord en direct. Les pipelines batch ne peuvent pas respecter ces SLA.
- **Les données arrivent en continu et doivent être traitées immédiatement** — Télémétrie IoT, clickstream, ticks financiers, événements applicatifs. La mise en tampon de ces données pour un traitement batch signifie que vous perdez les relations temporelles entre les événements qui contiennent le signal le plus fort.
- **Microservices événementiels** — Les services qui réagissent aux événements (commande passée → déclencher l'exécution → notifier l'entrepôt) sont architecturalement en flux. Traiter ces processus comme du batch introduit de la latence et du couplage.

### L'architecture hybride (Lambda/Kappa)

De nombreux systèmes de production ont besoin des deux. L'architecture Lambda (popularisée par Nathan Marz) exécute une couche de flux pour des résultats en temps réel et une couche batch pour un recalcul historique précis, servant les requêtes depuis une vue fusionnée. L'architecture Kappa simplifie cela en n'utilisant que la couche de flux, avec la possibilité de retraiter à partir de journaux d'événements immuables.

**Le modèle Kappa a largement prévalu** dans les piles modernes. La raison : maintenir deux bases de code de traitement distinctes (batch et flux) qui doivent produire des résultats équivalents est opérationnellement brutal. La rétention infinie de Kafka (via le stockage par niveaux) plus un processeur de flux comme Flink peut gérer à la fois le traitement en temps réel et le retraitement historique depuis la même base de code.

---

## Architecture Kafka : les fondations

Apache Kafka est la norme de facto pour l'infrastructure de streaming d'événements à l'échelle de l'entreprise. Comprendre les mécanismes internes est essentiel pour construire des pipelines fiables.

### Concepts fondamentaux

- Les **Topics** sont des journaux append-only, ordonnés et immuables. Les événements ne sont jamais mis à jour sur place ; de nouveaux événements sont toujours ajoutés en fin. C'est le choix de conception fondamental qui rend Kafka fiable et évolutif.
- Les **Partitions** sont l'unité de parallélisme. Un topic avec 12 partitions peut être consommé par jusqu'à 12 consommateurs en parallèle au sein d'un groupe de consommateurs. Le nombre de partitions est une décision de planification de la capacité que vous prenez à la création du topic — une sur-partition a des coûts (plus de descripteurs de fichiers, plus de surcharge de réplication), une sous-partition limite le débit.
- Les **Groupes de consommateurs** permettent à plusieurs applications indépendantes de consommer le même topic. Kafka suit l'offset de chaque groupe de consommateurs indépendamment. Votre système de détection de fraude et votre pipeline analytique peuvent tous deux consommer le même topic de paiements sans interférence.
- La **Réplication** assure la tolérance aux pannes. Un facteur de réplication de 3 signifie que chaque message est écrit sur 3 brokers. `min.insync.replicas=2` garantit qu'une écriture n'est acquittée qu'après confirmation par 2 répliques — le compromis durabilité/latence à ajuster.

### Producteur : écrire des événements de manière fiable

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

### Consommateur : traitement au moins une fois avec idempotence

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

La contrainte de conception critique ici : **votre fonction de traitement doit être idempotente.** La livraison au moins une fois signifie que vous traiterez occasionnellement le même message deux fois — lors du redémarrage d'un consommateur, d'un rééquilibrage ou après un échec de commit. Utilisez la clé d'idempotence naturelle de l'événement (généralement `event_id`) et les schémas vérifier-puis-insérer dans votre magasin d'état.

---

## Apache Flink : traitement de flux à l'échelle

Kafka gère le transport des événements. Flink gère le calcul avec état sur ces flux d'événements : agrégations fenêtrées, jointures d'enrichissement, CEP (Complex Event Processing) et transformations avec état en mode exactement-une-fois.

### Un squelette de job Flink : agrégation de signaux de fraude

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

### Considérations opérationnelles pour Flink

**Le checkpointing est fondamental.** Les garanties d'exactement-une-fois de Flink dépendent de points de contrôle cohérents vers un stockage durable (S3, GCS, HDFS). Si le checkpointing échoue systématiquement, votre job fonctionne en mode au-moins-une-fois ou pire. Surveillez la durée et les échecs de checkpoint comme des SLI de premier ordre.

**Sélection du backend d'état :**
- `HashMapStateBackend` (en mémoire) — rapide, mais l'état est perdu en cas de panne du gestionnaire de tâches et limite la taille de l'état à la taille du tas. Acceptable pour les jobs sans état ou à faible état.
- `EmbeddedRocksDBStateBackend` — état sur disque local + checkpoint vers le stockage distant. Requis pour les grands états (jointures contre des tables de référence, agrégations sur de longues fenêtres). Latence plus élevée qu'en mémoire mais nécessaire pour les charges de travail en production.

**Réglage des watermarks :** Votre stratégie de watermark détermine combien de temps Flink attend les événements tardifs avant de fermer une fenêtre. Trop agressive (délai court) et vous perdez des événements tardifs. Trop conservative (délai long) et vous augmentez la latence de bout en bout. Profilez la distribution du temps d'événement et définissez le délai au 99e percentile du lag d'événement, pas au maximum.

---

## Évolution de schéma : éviter les ruptures de pipeline

Les schémas changent. Le service qui produit `payments.events.v2` devra éventuellement ajouter un champ, renommer un champ ou changer un type. Sans stratégie de gestion de schéma, les changements de schéma cassent les consommateurs en aval en production.

**Confluent Schema Registry** est la solution standard pour Avro, Protobuf et JSON Schema. Chaque version de schéma est enregistrée et validée selon un mode de compatibilité :

- **Compatibilité ascendante** — Le nouveau schéma peut lire des données écrites par l'ancien schéma. Les nouveaux consommateurs peuvent lire les anciens messages. Sans risque pour l'ajout de champs optionnels.
- **Compatibilité descendante** — L'ancien schéma peut lire des données écrites par le nouveau schéma. Les anciens consommateurs peuvent lire les nouveaux messages. Sans risque pour la suppression de champs optionnels.
- **Compatibilité complète** — À la fois ascendante et descendante. La plus restrictive mais la plus sûre pour les groupes de consommateurs à long terme.

La règle opérationnelle : **imposez la compatibilité `FULL_TRANSITIVE` en production.** Tout changement de schéma qui casserait soit les anciens producteurs soit les anciens consommateurs doit passer par une migration en plusieurs étapes :

1. Ajouter le nouveau champ comme optionnel avec une valeur par défaut (compatible ascendant)
2. Déployer tous les consommateurs pour gérer le nouveau champ
3. Déployer les producteurs pour renseigner le nouveau champ
4. Marquer l'ancien champ comme déprécié
5. Après la mise à jour de tous les consommateurs, supprimer l'ancien champ dans une version ultérieure

Ne supprimez jamais un champ requis, ne renommez pas un champ et ne changez pas le type d'un champ dans un seul déploiement.

---

## Change Data Capture (CDC) : streaming depuis les bases de données

De nombreuses architectures événementielles doivent streamer les changements depuis des bases de données relationnelles existantes vers Kafka sans modifier le code applicatif. Le CDC lit le journal de transactions de la base de données et publie les changements au niveau des lignes sous forme d'événements.

**Debezium** est la plateforme CDC open source standard. Il supporte PostgreSQL (réplication logique), MySQL (binlog), Oracle (LogMiner) et SQL Server (CDC). Un connecteur Debezium déployé dans Kafka Connect lit le journal de transactions et publie les événements `INSERT`, `UPDATE` et `DELETE` vers des topics Kafka.

Considérations opérationnelles clés pour Debezium CDC :
- Activez `REPLICA IDENTITY FULL` sur les tables PostgreSQL pour lesquelles vous voulez des images complètes avant/après sur les mises à jour (par défaut, seule la clé primaire est incluse dans l'image précédente)
- Les slots de réplication accumulent du WAL si le connecteur prend du retard — surveillez agressivement le lag du slot ; une croissance non contrôlée peut remplir le disque et faire planter PostgreSQL
- L'instantané initial de grandes tables peut prendre des heures et générer une charge significative sur la base de données — planifiez pendant les périodes de faible trafic

---

## Lakehouse de données et transformations dbt

La pile de données moderne converge vers le **modèle lakehouse** : des formats de tables ouverts (Apache Iceberg, Delta Lake) sur du stockage objet fournissent des transactions ACID, le voyage dans le temps et l'évolution de schéma sur la couche de stockage, servis par des moteurs de requêtes (Trino, Spark, Snowflake) et une couche de calcul.

Les sorties de traitement en flux atterrissent directement dans les tables Iceberg. dbt exécute des modèles de transformation par-dessus pour les cas d'usage analytiques :

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

## Observabilité du pipeline : la couche non négociable

Un pipeline de données sans observabilité est une responsabilité. Vous ne saurez pas qu'il est cassé jusqu'à ce que quelqu'un se plaigne de tableaux de bord périmés ou de SLA manqués. La couche d'observabilité pour les pipelines de données couvre quatre dimensions :

**Fraîcheur :** Les données arrivent-elles dans les délais ? Définissez des SLO par topic (par exemple, le topic des paiements doit avoir des événements dans les 60 dernières secondes). Alertez quand l'horodatage du dernier événement dépasse le seuil du SLO.

**Volume :** Le volume de données est-il dans les bornes attendues ? Des baisses soudaines indiquent des pannes ou des interruptions en amont. Des pics soudains indiquent des problèmes de qualité des données ou des incidents en amont. Utilisez le contrôle statistique des processus (moyenne mobile + bandes d'écart-type) plutôt que des seuils statiques pour les alertes de volume.

**Schéma :** Les événements se conforment-ils au schéma enregistré ? Suivez les taux d'échec de validation de schéma par topic. Un pic d'échecs de schéma signifie qu'un producteur a déployé un changement cassant.

**Latence de bout en bout :** Combien de temps faut-il entre la création d'un événement et sa disponibilité dans la couche de service ? Instrumentez avec l'horodatage de création de l'événement intégré dans l'événement, et mesurez à chaque étape du pipeline. Latence P50/P95/P99 par étape du pipeline.

Outillage : **OpenTelemetry** pour l'instrumentation, **Prometheus + Grafana** pour les métriques, **Apache Atlas** ou **OpenMetadata** pour la lignée des données. Great Expectations ou Soda pour les assertions de qualité des données intégrées dans le pipeline.

---

## Optimisation des coûts

L'infrastructure de streaming est coûteuse si elle n'est pas contrôlée. Les leviers de coût les plus importants :

- **Rétention Kafka :** Ne conservez pas les données dans Kafka plus longtemps que nécessaire pour la récupération des groupes de consommateurs (72 heures suffisent généralement). Utilisez le stockage par niveaux de Kafka pour déplacer les segments plus anciens vers le stockage objet à un coût nettement inférieur si une longue rétention est nécessaire pour la relecture.
- **Parallélisme Flink :** Les gestionnaires de tâches Flink surdimensionnés sont un gaspillage courant. Utilisez l'autoscaling de Flink (Kubernetes HPA sur des métriques personnalisées, ou autoscaling géré dans l'opérateur Flink on Kubernetes) pour faire évoluer le parallélisme en fonction du lag du groupe de consommateurs Kafka.
- **Séparation calcul-stockage :** Stockez tout l'état persistant dans le stockage objet (Iceberg sur S3), pas dans les nœuds de calcul. Les clusters de calcul peuvent descendre à zéro entre les jobs. C'est l'avantage de coût fondamental du modèle lakehouse par rapport aux architectures de l'ère Hadoop.
- **Traitement par niveaux :** Tous les événements ne nécessitent pas une latence inférieure à la seconde. Routez les types d'événements prioritaires à travers le pipeline Flink en temps réel ; routez les événements moins prioritaires vers un job micro-batch (toutes les 5 minutes). La différence de coût est significative.

> Les organisations qui construisent bien l'infrastructure de streaming partagent un trait commun : elles instrumentent d'abord et optimisent en continu. Elles ne conçoivent pas pour le coût — elles conçoivent pour la correction et l'observabilité, puis utilisent les données d'observabilité pour prendre des décisions de coût éclairées. L'optimisation prématurée des coûts dans l'infrastructure de données, c'est ainsi qu'on se retrouve avec des pipelines ingérables auxquels personne ne fait confiance.

Le pipeline de données moderne n'est pas une séquence de scripts. C'est un système distribué avec les mêmes exigences opérationnelles que tout service en production : SLO, runbooks, rotations d'astreinte et post-mortems d'incidents. Les équipes qui le traitent ainsi construisent une infrastructure qui prend de la valeur au fil des années. Celles qui ne le font pas combattent perpétuellement les incendies.
