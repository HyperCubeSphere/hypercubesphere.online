---
title: "Ottimizzazione dei Costi Cloud: Lezioni da Oltre 50 Migrazioni"
description: "Come ridurre la spesa cloud del 30–50% senza sacrificare l'affidabilità. Una guida pratica che copre il right-sizing, la strategia della capacità riservata, l'adozione ARM, il tiering dello storage, le pratiche FinOps e il controllo dei costi Kubernetes."
date: "2025-12-03"
author: "HyperCubeSphere Engineering"
tags: ["cloud", "finops", "ottimizzazione-costi", "aws", "kubernetes", "devops"]
---

Le bollette cloud sono l'equivalente moderno della trappola delle licenze software enterprise. Si inizia in piccolo, la crescita giustifica la spesa, gli ingegneri ottimizzano per la velocità piuttosto che per il costo, e nel momento in cui il CFO pone la domanda, si sta spendendo $800K/mese in infrastrutture che potrebbero servire lo stesso carico per $400K.

Abbiamo condotto interventi di ottimizzazione dei costi in oltre 50 organizzazioni — da startup di 8 persone con una bolletta AWS di $15K/mese a enterprise Fortune 500 che spendono $3M/mese su multi-cloud. I pattern che guidano gli sprechi sono notevolmente coerenti. Lo sono anche gli interventi che li eliminano.

Questa non è una lista di consigli generici. È una metodologia strutturata con numeri reali.

## La Baseline: Come Appare lo "Spreco Normale"

Prima di presentare le soluzioni, stabilire con cosa probabilmente si ha a che fare. Nella nostra esperienza, le organizzazioni rientrano in tre profili di spreco:

**Profilo A — Il Scalatore Reattivo (40% delle organizzazioni)**
Infrastrutture provisionate in risposta agli incidenti. Tutto è sovra-dimensionato "per sicurezza". Spreco tipico: 35–50% della bolletta totale.

**Profilo B — L'Artefatto della Crescita (45% delle organizzazioni)**
Infrastrutture che avevano senso a una scala precedente, mai ridimensionate man mano che l'architettura evolveva. Spreco tipico: 20–35% della bolletta totale.

**Profilo C — Lo Sprawl Gestito (15% delle organizzazioni)**
Più team, più account, tagging incoerente, shadow IT. Difficile anche solo stabilire una baseline. Spreco tipico: 25–45% della bolletta totale.

La maggior parte delle organizzazioni è una combinazione di B e C.

> **La cifra di riduzione del 30–50% non è aspirazionale. È il risultato consistente dell'applicazione di una metodologia sistematica a qualsiasi organizzazione che non abbia eseguito un programma di ottimizzazione formale negli ultimi 18 mesi.**

## Fase 1: Visibilità Prima dell'Azione

Il singolo errore di ottimizzazione più comune è agire prima di avere visibilità completa. I team ridimensionano alcune istanze EC2, risparmiano $3K/mese e dichiarano vittoria — mentre $50K/mese in costi di storage S3, volumi EBS non collegati e istanze RDS inattive rimangono intoccati.

### Strategia di Tagging: La Fondazione di Tutto

Non puoi ottimizzare ciò che non puoi attribuire. Implementare uno schema di tagging obbligatorio prima di qualsiasi altra azione:

| Chiave Tag | Obbligatorio | Valori di Esempio |
|---|---|---|
| `Environment` | Sì | `production`, `staging`, `dev`, `sandbox` |
| `Team` | Sì | `platform`, `product`, `data-eng` |
| `Service` | Sì | `api-gateway`, `worker-payments`, `ml-inference` |
| `CostCenter` | Sì | `cc-4421`, `cc-engineering` |
| `ManagedBy` | Sì | `terraform`, `helm`, `manual` |
| `Criticality` | Sì | `critical`, `standard`, `low` |
| `DataClassification` | Se applicabile | `pii`, `confidential`, `public` |

Applicare questo tramite Service Control Policy (AWS) o Organization Policy (GCP). Le risorse che non soddisfano la conformità del tagging non dovrebbero essere provisionabili. Questa non è burocrazia — è il prerequisito per il FinOps.

### Rilevamento delle Anomalie dei Costi

Configurare il rilevamento delle anomalie dei costi prima di fare qualsiasi altra cosa. AWS Cost Anomaly Detection, GCP Budget Alerts o Azure Cost Alerts lo offrono tutti nativamente. Configurare alert per:
- Aumento del 10% settimana su settimana per servizio
- Soglie assolute per team/centro di costo
- Picchi di spesa per tipo di istanza

Nella nostra esperienza, il rilevamento delle anomalie ripaga il tempo speso per configurarlo entro i primi 30 giorni in ogni singolo intervento.

## Fase 2: Right-Sizing del Compute

Il compute (EC2, nodi GKE, VM AKS, Lambda) rappresenta tipicamente il 40–60% della spesa cloud totale. Il right-sizing è dove si trovano i risparmi in dollari assoluti più elevati.

### La Metodologia di Right-Sizing

Non eseguire mai il right-sizing in base all'utilizzo medio. Eseguire il right-sizing in base al **P95 dell'utilizzo su una finestra di 30 giorni**, con headroom applicato in base alla criticità del carico di lavoro:

| Tipo di Carico di Lavoro | Target P95 CPU | Target P95 Memoria | Headroom |
|---|---|---|---|
| API senza stato | 60–70% | 70–80% | 30–40% |
| Worker in background | 70–80% | 75–85% | 20–30% |
| Database | 40–60% | 80–90% | 40–60% |
| Batch/ML inference | 85–95% | 85–95% | 5–15% |
| Dev/staging | 80–90% | 80–90% | 10–20% |

L'errore di right-sizing più comune: usare target di headroom CPU progettati per API senza stato sui database. Un'istanza di database dovrebbe funzionare a un utilizzo della CPU molto più basso di un server API — l'headroom di memoria e IOPS è ciò che conta.

### Adozione ARM/Graviton: Il Singolo Cambiamento con il ROI Più Alto

Le istanze AWS Graviton3 (famiglie M7g, C7g, R7g) forniscono **un rapporto prezzo-prestazioni del 20–40% migliore** rispetto alle istanze x86 Intel/AMD equivalenti allo stesso costo o inferiore. Questa è l'ottimizzazione più affidabile e a minor rischio disponibile oggi.

**Numeri reali da un intervento recente:**

| Tipo di Istanza | vCPU | Memoria | Prezzo On-Demand | Equivalente Graviton | Prezzo Graviton | Risparmio |
|---|---|---|---|---|---|---|
| `m5.2xlarge` | 8 | 32 GiB | $0,384/h | `m7g.2xlarge` | $0,3264/h | 15% |
| `c5.4xlarge` | 16 | 32 GiB | $0,680/h | `c7g.4xlarge` | $0,5808/h | 15% |
| `r5.2xlarge` | 8 | 64 GiB | $0,504/h | `r7g.2xlarge` | $0,4284/h | 15% |

Quando si combina la riduzione diretta dei costi con il miglioramento delle prestazioni (che spesso permette di eseguire meno istanze o istanze più piccole), i risparmi effettivi sul compute possono raggiungere il 30–40%.

Il percorso di migrazione per i carichi di lavoro containerizzati è semplice: aggiornare le immagini base alle varianti compatibili con ARM (la maggior parte delle principali immagini Docker Hub ora pubblica manifest multi-arch), aggiornare i tipi di istanza EC2, ricostruire. La maggior parte dei carichi di lavoro Node.js, Python, Java e Go funziona su Graviton senza modifiche al codice.

### Strategia Riservate vs. Spot

La decisione sul modello di acquisto è il punto in cui molte organizzazioni lasciano una quantità significativa di denaro sul tavolo. Il framework:

**On-Demand:** Usare per carichi di lavoro imprevedibili, nuovi servizi in cui il dimensionamento è incerto e qualsiasi cosa non ancora caratterizzata.

**Istanze Riservate (1 anno):** Applicare a tutto il compute di base che si esegue da più di 6 mesi. L'impegno è a minor rischio di quanto appaia — le RI di 1 anno raggiungono il pareggio rispetto all'on-demand in 7–8 mesi. Per m7g.2xlarge, RI di 1 anno senza anticipo: $0,2286/h vs $0,3264/h on-demand. **Risparmio del 30%, nessun cambiamento di rischio.**

**Istanze Spot:** Applicare a carichi di lavoro tolleranti ai guasti e alle interruzioni: elaborazione batch, addestramento ML, pipeline di dati, agenti di build CI/CD. I prezzi Spot sono del 70–90% inferiori all'on-demand. Il tasso di interruzione varia per famiglia di istanze e regione, ma per i carichi di lavoro costruiti per gestirlo, lo Spot è trasformativo.

**Configurazione Spot pratica per Kubernetes:**

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

## Fase 3: Tiering dello Storage

I costi di storage sono insidiosi perché crescono silenziosamente. Un bucket S3 riempito di log a cui nessuno accede non allarma nessuno — finché non costa $40K/mese.

### S3 Intelligent-Tiering

Abilitare S3 Intelligent-Tiering su tutti i bucket in cui i pattern di accesso sono sconosciuti o misti. Il servizio sposta automaticamente gli oggetti tra i livelli senza costi di recupero:

- **Livello di Accesso Frequente**: Prezzi Standard
- **Livello di Accesso Non Frequente**: Costo di storage inferiore del 40% (dopo 30 giorni senza accesso)
- **Archive Instant Access**: Inferiore del 68% (dopo 90 giorni)
- **Deep Archive**: Inferiore del 95% (dopo 180 giorni)

Per la maggior parte dei bucket di logging, artefatti e backup, Intelligent-Tiering riduce i costi di storage del 40–60% entro 90 giorni dall'abilitazione, senza alcuno sforzo ingegneristico oltre all'abilitazione della funzionalità.

### Audit di EBS e Storage Database

Eseguire un audit mensile per:
- **Volumi EBS non collegati** — volumi che esistono senza un'istanza collegata. Questi sono puro spreco e vengono spesso lasciati dopo la terminazione dell'istanza. Troviamo, in media, che l'8–15% della spesa EBS è dovuta a volumi non collegati.
- **Storage RDS sovra-dimensionato** — lo storage RDS si espande automaticamente ma non si riduce. Controllare lo storage allocato rispetto a quello utilizzato.
- **Accumulo di snapshot** — snapshot che non sono mai stati puliti, a volte risalenti ad anni fa. Impostare policy di ciclo di vita.

## Fase 4: Ottimizzazione dei Costi Kubernetes

I cluster Kubernetes sono amplificatori di costi — sia al rialzo che al ribasso. Quando configurati bene, l'efficienza del bin-packing e l'uso dello Spot rendono Kubernetes significativamente più economico delle istanze autonome equivalenti. Quando configurati male, i cluster Kubernetes rimangono inattivi al 20–30% di utilizzo e sprecano denaro su scala.

### Disciplina delle Resource Request e Limit

Il problema di costi Kubernetes più comune: request impostate uguali ai limit, entrambi impostati in modo conservativo alto.

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

Le decisioni dello scheduler si basano sulle **request**, non sui limit. Le request sovra-dimensionate causano un bin-packing scadente, il che significa che si ha bisogno di più nodi. Usare uno strumento come VPA (Vertical Pod Autoscaler) in modalità raccomandazione per raccogliere dati di utilizzo effettivi, poi ridimensionare le request di conseguenza.

### Visibilità dei Costi a Livello di Namespace

Implementare l'allocazione dei costi a livello di namespace usando OpenCost o Kubecost. Mappare i namespace ai team. Pubblicare report settimanali sui costi per team. Il cambiamento comportamentale derivante dalla visibilità dei costi da sola — gli ingegneri che vedono la spesa infrastrutturale del proprio team — riduce consistentemente del 10–15% senza alcun intervento tecnico.

## Fase 5: FinOps come Pratica Continua

Gli interventi di ottimizzazione una tantum producono risultati una tantum. Le organizzazioni che mantengono costi cloud inferiori del 30–50% trattano l'efficienza dei costi come una disciplina ingegneristica, non come un audit periodico.

### Il Modello Operativo FinOps

**Settimanale:**
- Report automatizzato delle anomalie dei costi ai responsabili ingegneristici
- Alert su nuove risorse senza tag
- Revisione del tasso di interruzione Spot

**Mensile:**
- Report dei costi per team rispetto al budget
- Raccomandazioni di right-sizing (automatizzate tramite AWS Compute Optimizer o equivalente)
- Revisione della copertura delle Istanze Riservate
- Sweep delle risorse non collegate

**Trimestrale:**
- Revisione della strategia di rinnovo e copertura delle RI
- Revisione architettuale dei costi per i servizi ad alta spesa
- Benchmark di spesa per unità di valore aziendale (costo per richiesta, costo per utente, costo per transazione)

Il benchmark di economia unitaria è la metrica più importante. La spesa cloud assoluta crescerà man mano che il business cresce. Il **costo per unità di valore aziendale** dovrebbe diminuire nel tempo. Se non lo fa, si sta accumulando inefficienza più velocemente di quanto si stia crescendo.

### Arbitraggio Multi-Cloud

Per le organizzazioni che eseguono carichi di lavoro su più cloud, l'arbitraggio dei prezzi Spot tra provider può produrre risparmi aggiuntivi. Questo richiede portabilità dei carichi di lavoro (container, object storage cloud-agnostico tramite API compatibili S3) e la disponibilità ad aggiungere complessità operativa.

L'economia può essere significativa: il compute GPU per i carichi di lavoro ML varia del 20–40% tra AWS, GCP e Azure in qualsiasi momento, e la varianza dei prezzi spot/preemptible può raggiungere il 60% tra provider per la stessa generazione hardware sottostante.

Il break-even sull'arbitraggio multi-cloud richiede tipicamente $200K+/mese in spesa GPU prima che l'overhead operativo lo giustifichi. Al di sotto di tale soglia, impegnarsi con un singolo provider e ottimizzare lì.

## Come Appare il 30–50% nella Realtà

Un intervento rappresentativo: una società SaaS di Serie B, bolletta AWS di $240K/mese, team di ingegneria di 40 persone.

**Azioni intraprese nell'arco di 90 giorni:**

1. Configurazione del tagging e del rilevamento delle anomalie: 2 settimane
2. Migrazione Graviton per tutti i carichi di lavoro senza stato: 3 settimane, risparmio di $18K/mese
3. Right-sizing basato sulle raccomandazioni di Compute Optimizer: 2 settimane, risparmio di $22K/mese
4. Adozione Spot per CI/CD e carichi di lavoro batch: 1 settimana, risparmio di $14K/mese
5. S3 Intelligent-Tiering + policy di ciclo di vita degli snapshot: 1 settimana, risparmio di $8K/mese
6. Acquisto di RI di 1 anno per il baseline compute stabile: risparmio di $19K/mese
7. Right-sizing delle resource request Kubernetes: 2 settimane, risparmio di $11K/mese

**Totale: riduzione di $92K/mese. 38% della bolletta originale. Periodo di recupero dell'investimento: 3 settimane.**

Le riduzioni si moltiplicano nel tempo man mano che gli ingegneri interiorizzano la disciplina e il modello operativo FinOps cattura i nuovi sprechi prima che si accumulino.

L'ottimizzazione dei costi cloud non è un esercizio di riduzione dei costi. È una disciplina di eccellenza ingegneristica. Le organizzazioni che la trattano in questo modo costruiscono la struttura dei costi che permette loro di investire più dei concorrenti quando conta.
