---
title: "Optimización de costes en la nube: lecciones de más de 50 migraciones"
description: "Cómo reducir el gasto en la nube entre un 30 y un 50% sin sacrificar la fiabilidad. Una guía del profesional que cubre el dimensionamiento correcto, la estrategia de capacidad reservada, la adopción de ARM, el almacenamiento por niveles, las prácticas FinOps y el control de costes en Kubernetes."
date: "2025-12-03"
author: "HyperCubeSphere Engineering"
tags: ["nube", "finops", "optimización-de-costes", "aws", "kubernetes", "devops"]
---

Las facturas de la nube son el equivalente moderno de la trampa de las licencias de software empresarial. Se empieza en pequeño, el crecimiento justifica el gasto, los ingenieros optimizan por velocidad en lugar de por coste, y cuando el CFO hace la pregunta, se están ejecutando 800.000$/mes de infraestructura que podría atender la misma carga por 400.000$.

Hemos llevado a cabo compromisos de optimización de costes en más de 50 organizaciones — desde startups de 8 personas con una factura de AWS de 15.000$/mes hasta empresas Fortune 500 que gastan 3 M$/mes en multi-nube. Los patrones que generan desperdicio son notablemente consistentes. También lo son las intervenciones que lo eliminan.

Esto no es una lista de consejos genéricos. Es una metodología estructurada con números reales.

## La referencia: cómo es el desperdicio "normal"

Antes de presentar soluciones, establezca con qué está tratando probablemente. En nuestra experiencia, las organizaciones caen en tres perfiles de desperdicio:

**Perfil A — El escalador reactivo (40% de las organizaciones)**
Infraestructura aprovisionada en respuesta a incidentes. Todo está sobredimensionado "por si acaso". Desperdicio típico: 35 a 50% de la factura total.

**Perfil B — El artefacto de crecimiento (45% de las organizaciones)**
Infraestructura que tenía sentido a una escala anterior, nunca redimensionada a medida que la arquitectura evolucionó. Desperdicio típico: 20 a 35% de la factura total.

**Perfil C — La expansión gestionada (15% de las organizaciones)**
Múltiples equipos, múltiples cuentas, etiquetado inconsistente, Shadow IT. Difícil incluso establecer una referencia. Desperdicio típico: 25 a 45% de la factura total.

La mayoría de las organizaciones son alguna combinación de B y C.

> **La cifra de reducción del 30 al 50% no es aspiracional. Es el resultado consistente de aplicar una metodología sistemática a cualquier organización que no ha ejecutado un programa de optimización formal en los últimos 18 meses.**

## Fase 1: Visibilidad antes de actuar

El error de optimización más común es actuar antes de tener visibilidad completa. Los equipos redimensionan algunas instancias EC2, ahorran 3.000$/mes y declaran la victoria — mientras 50.000$/mes en costes de almacenamiento de S3, volúmenes de EBS no conectados e instancias de RDS inactivas pasan desapercibidos.

### Estrategia de etiquetado: la base de todo

No se puede optimizar lo que no se puede atribuir. Implemente un esquema de etiquetado obligatorio antes de cualquier otra acción:

| Clave de etiqueta | Obligatoria | Valores de ejemplo |
|---|---|---|
| `Environment` | Sí | `production`, `staging`, `dev`, `sandbox` |
| `Team` | Sí | `platform`, `product`, `data-eng` |
| `Service` | Sí | `api-gateway`, `worker-payments`, `ml-inference` |
| `CostCenter` | Sí | `cc-4421`, `cc-engineering` |
| `ManagedBy` | Sí | `terraform`, `helm`, `manual` |
| `Criticality` | Sí | `critical`, `standard`, `low` |
| `DataClassification` | Si aplica | `pii`, `confidential`, `public` |

Aplique esto mediante Políticas de Control de Servicios (AWS) o Política de Organización (GCP). Los recursos que no cumplan con la conformidad de etiquetado no deberían poder aprovisionarse. Esto no es burocracia — es el prerrequisito para FinOps.

### Detección de anomalías de coste

Configure la detección de anomalías de coste antes de hacer cualquier otra cosa. AWS Cost Anomaly Detection, GCP Budget Alerts o Azure Cost Alerts ofrecen esto de forma nativa. Configure alertas para:
- Aumentos del 10% semana a semana por servicio
- Umbrales absolutos por equipo/centro de coste
- Picos de gasto por tipo de instancia

En nuestra experiencia, la detección de anomalías compensa el tiempo dedicado a configurarla en los primeros 30 días en cada compromiso.

## Fase 2: Dimensionamiento correcto del cómputo

El cómputo (EC2, nodos de GKE, VMs de AKS, Lambda) representa típicamente entre el 40 y el 60% del gasto total en la nube. El dimensionamiento correcto es donde viven los mayores ahorros absolutos en dólares.

### La metodología de dimensionamiento correcto

Nunca dimensione basándose en la utilización promedio. Dimensione basándose en la **utilización P95 durante una ventana de 30 días**, con un margen aplicado según la criticidad de la carga de trabajo:

| Tipo de carga de trabajo | Objetivo CPU P95 | Objetivo memoria P95 | Margen |
|---|---|---|---|
| API sin estado | 60–70% | 70–80% | 30–40% |
| Worker en segundo plano | 70–80% | 75–85% | 20–30% |
| Base de datos | 40–60% | 80–90% | 40–60% |
| Batch/Inferencia ML | 85–95% | 85–95% | 5–15% |
| Dev/staging | 80–90% | 80–90% | 10–20% |

El error de dimensionamiento más común: usar objetivos de margen de CPU diseñados para APIs sin estado en bases de datos. Una instancia de base de datos debería funcionar a una utilización de CPU mucho menor que un servidor API — el margen de memoria e IOPS es lo que importa.

### Adopción de ARM/Graviton: el cambio de mayor ROI

Las instancias AWS Graviton3 (familias M7g, C7g, R7g) ofrecen **entre un 20 y un 40% mejor rendimiento por precio** que las instancias x86 Intel/AMD equivalentes al mismo coste o inferior. Esta es la optimización más confiable y de menor riesgo disponible hoy.

**Números reales de un compromiso reciente:**

| Tipo de instancia | vCPU | Memoria | Precio bajo demanda | Equivalente Graviton | Precio Graviton | Ahorro |
|---|---|---|---|---|---|---|
| `m5.2xlarge` | 8 | 32 GiB | 0,384$/h | `m7g.2xlarge` | 0,3264$/h | 15% |
| `c5.4xlarge` | 16 | 32 GiB | 0,680$/h | `c7g.4xlarge` | 0,5808$/h | 15% |
| `r5.2xlarge` | 8 | 64 GiB | 0,504$/h | `r7g.2xlarge` | 0,4284$/h | 15% |

Cuando se combina la reducción directa de costes con la mejora del rendimiento (que a menudo permite ejecutar menos instancias o más pequeñas), el ahorro efectivo en cómputo puede alcanzar entre el 30 y el 40%.

La ruta de migración para cargas de trabajo en contenedores es sencilla: actualice las imágenes base a variantes compatibles con ARM (la mayoría de las imágenes principales de Docker Hub ahora publican manifiestos multi-arch), actualice los tipos de instancias EC2, recompile. La mayoría de las cargas de trabajo de Node.js, Python, Java y Go funcionan en Graviton sin cambios en el código.

### Estrategia reservado vs. spot

La decisión del modelo de compra es donde muchas organizaciones dejan dinero significativo sobre la mesa. El marco:

**Bajo demanda:** Use para cargas de trabajo impredecibles, nuevos servicios donde el dimensionamiento es incierto, y cualquier cosa que aún no haya caracterizado.

**Instancias reservadas (1 año):** Aplique a todo el cómputo de referencia que ha estado ejecutando durante 6+ meses. El compromiso es menos arriesgado de lo que parece — las RI de 1 año alcanzan el punto de equilibrio frente a la demanda en 7 a 8 meses. Para m7g.2xlarge, RI de 1 año sin pago inicial: 0,2286$/h vs 0,3264$/h bajo demanda. **30% de ahorro, cero cambio de riesgo.**

**Instancias spot:** Aplique a cargas de trabajo tolerantes a fallos e interrupciones: procesamiento por lotes, entrenamiento de ML, pipelines de datos, agentes de compilación CI/CD. Los precios spot se sitúan entre el 70 y el 90% por debajo de la demanda. La tasa de interrupción varía según la familia de instancias y la región, pero para las cargas de trabajo construidas para ello, el spot es transformador.

**Configuración práctica de spot para Kubernetes:**

```yaml
# Karpenter NodePool — mixed on-demand and spot with intelligent fallback
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: general-purpose
spec:
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]
        - key: kubernetes.io/arch
          operator: In
          values: ["arm64"]  # Graviton-first
        - key: karpenter.k8s.aws/instance-family
          operator: In
          values: ["m7g", "c7g", "r7g"]
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
  disruption:
    consolidationPolicy: WhenUnderutilized
    consolidateAfter: 30s
```

## Fase 3: Almacenamiento por niveles

Los costes de almacenamiento son insidiosos porque crecen silenciosamente. Un bucket de S3 lleno de registros a los que nadie accede no genera alarmas — hasta que son 40.000$/mes.

### S3 Intelligent-Tiering

Active S3 Intelligent-Tiering en todos los buckets donde los patrones de acceso son desconocidos o mixtos. El servicio mueve automáticamente los objetos entre niveles sin coste de recuperación:

- **Nivel de acceso frecuente**: Precio estándar
- **Nivel de acceso poco frecuente**: 40% menos de coste de almacenamiento (después de 30 días sin acceso)
- **Archive Instant Access**: 68% menos (después de 90 días)
- **Deep Archive**: 95% menos (después de 180 días)

Para la mayoría de los buckets de registros, artefactos y copias de seguridad, Intelligent-Tiering reduce los costes de almacenamiento entre un 40 y un 60% dentro de los 90 días posteriores a su activación, sin ningún esfuerzo de ingeniería más allá de activar la función.

### Auditoría de almacenamiento de EBS y bases de datos

Ejecute una auditoría mensual para:
- **Volúmenes de EBS no conectados** — volúmenes que existen sin una instancia conectada. Son desperdicio puro y a menudo se dejan después de la terminación de instancias. Encontramos en promedio que entre el 8 y el 15% del gasto en EBS corresponde a volúmenes no conectados.
- **Almacenamiento de RDS sobredimensionado** — el almacenamiento de RDS se autoescala hacia arriba pero nunca hacia abajo. Audite el almacenamiento asignado frente al utilizado.
- **Acumulación de snapshots** — snapshots que nunca se limpiaron, a veces remontándose a años. Establezca políticas de ciclo de vida.

## Fase 4: Optimización de costes en Kubernetes

Los clústeres de Kubernetes son amplificadores de costes — en ambas direcciones. Cuando se configuran bien, la eficiencia de bin-packing y el uso de spot hacen a Kubernetes significativamente más barato que instancias independientes equivalentes. Cuando se configuran mal, los clústeres de Kubernetes operan a una utilización del 20 al 30% y desperdician dinero a escala.

### Disciplina de solicitudes y límites de recursos

El problema de coste más común en Kubernetes: las solicitudes de recursos configuradas para coincidir con los límites, ambos configurados de forma conservadoramente alta.

```yaml
# Common anti-pattern — requests equal limits, both high
resources:
  requests:
    cpu: "2000m"
    memory: "4Gi"
  limits:
    cpu: "2000m"
    memory: "4Gi"

# Better — right-sized requests, appropriate limits
resources:
  requests:
    cpu: "400m"       # Based on P95 actual usage
    memory: "512Mi"   # Based on P95 actual usage
  limits:
    cpu: "2000m"      # Allow burst
    memory: "1Gi"     # Hard limit — OOM rather than unbounded growth
```

Las decisiones del scheduler se basan en las **solicitudes**, no en los límites. Las solicitudes sobredimensionadas causan un bin-packing deficiente, lo que significa que se necesitan más nodos. Use una herramienta como VPA (Vertical Pod Autoscaler) en modo de recomendación para recopilar datos de utilización real, luego ajuste las solicitudes en consecuencia.

### Visibilidad de costes a nivel de namespace

Implemente la asignación de costes a nivel de namespace usando OpenCost o Kubecost. Mapee los namespaces a los equipos. Publique informes de costes semanales por equipo. El cambio de comportamiento de la visibilidad de costes por sí sola — los ingenieros viendo el gasto en infraestructura de su equipo — genera consistentemente una reducción del 10 al 15% sin ninguna intervención técnica.

## Fase 5: FinOps como práctica continua

Los compromisos de optimización puntuales producen resultados puntuales. Las organizaciones que mantienen costes en la nube entre un 30 y un 50% menores tratan la eficiencia de costes como una disciplina de ingeniería, no como una auditoría periódica.

### El modelo operativo FinOps

**Semanal:**
- Informe automatizado de anomalías de coste para los líderes de ingeniería
- Alertas de nuevos recursos sin etiquetar
- Revisión de la tasa de interrupción de spot

**Mensual:**
- Informe de costes por equipo vs. presupuesto
- Recomendaciones de dimensionamiento correcto (automatizadas a través de AWS Compute Optimizer o equivalente)
- Revisión de cobertura de instancias reservadas
- Barrido de recursos no conectados

**Trimestral:**
- Revisión de la estrategia de renovación y cobertura de RI
- Revisión arquitectónica de costes para los servicios de mayor gasto
- Punto de referencia de gasto por unidad de valor de negocio (coste por solicitud, coste por usuario, coste por transacción)

El punto de referencia de economías unitarias es la métrica más importante. El gasto absoluto en la nube crecerá a medida que crezca el negocio. El **coste por unidad de valor de negocio** debería disminuir con el tiempo. Si no es así, se está acumulando ineficiencia más rápido de lo que se crece.

### Arbitraje multi-nube

Para las organizaciones que ejecutan cargas de trabajo en múltiples nubes, el arbitraje de precios spot entre proveedores puede generar ahorros adicionales. Esto requiere portabilidad de cargas de trabajo (contenedores, almacenamiento de objetos agnóstico a la nube a través de APIs compatibles con S3) y disposición a añadir complejidad operacional.

Las economías pueden ser significativas: el cómputo de GPU para cargas de trabajo de ML varía entre un 20 y un 40% entre AWS, GCP y Azure en cualquier momento dado, y la variación en los precios spot/interrumpibles puede alcanzar el 60% entre proveedores para la misma generación de hardware subyacente.

El punto de equilibrio del arbitraje multi-nube generalmente requiere más de 200.000$/mes en gasto de GPU antes de que la sobrecarga operacional lo justifique. Por debajo de ese umbral, comprométase con un solo proveedor y optimice allí.

## Cómo se ven realmente el 30 al 50%

Un compromiso representativo: una empresa SaaS en Serie B, factura de AWS de 240.000$/mes, equipo de ingeniería de 40 personas.

**Acciones tomadas durante 90 días:**

1. Aplicación de etiquetado + configuración de detección de anomalías: 2 semanas
2. Migración a Graviton para todas las cargas de trabajo sin estado: 3 semanas, 18.000$/mes ahorrados
3. Dimensionamiento correcto basado en recomendaciones de Compute Optimizer: 2 semanas, 22.000$/mes ahorrados
4. Adopción de spot para CI/CD y cargas de trabajo por lotes: 1 semana, 14.000$/mes ahorrados
5. S3 Intelligent-Tiering + políticas de ciclo de vida de snapshots: 1 semana, 8.000$/mes ahorrados
6. Compra de RI de 1 año para la base de cómputo estable: 19.000$/mes ahorrados
7. Dimensionamiento correcto de las solicitudes de recursos de Kubernetes: 2 semanas, 11.000$/mes ahorrados

**Total: reducción de 92.000$/mes. 38% de la factura original. Período de retorno sobre el coste del compromiso: 3 semanas.**

Las reducciones se componen con el tiempo a medida que los ingenieros internalizan la disciplina y el modelo operativo FinOps captura el nuevo desperdicio antes de que se acumule.

La optimización de costes en la nube no es un ejercicio de reducción de costes. Es una disciplina de excelencia en ingeniería. Las organizaciones que la tratan así construyen la estructura de costes que les permite superinvertir frente a los competidores cuando importa.
