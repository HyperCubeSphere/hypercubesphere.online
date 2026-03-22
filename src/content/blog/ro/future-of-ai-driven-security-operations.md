---
title: "Viitorul Operațiunilor de Securitate Conduse de Inteligența Artificială"
date: "2026-03-22"
author: "HyperCubeSphere Engineering"
tags: ["securitate", "AI", "SOC", "machine learning", "detecția amenințărilor"]
excerpt: "Modelele ML reshapează fundamental modul în care centrele de operațiuni de securitate detectează amenințările, triajează alertele și răspund la incidente. Iată cum arată ingineria sub capotă."
---

Un analist mediu dintr-un SOC enterprise gestionează peste 1.000 de alerte pe zi. Mai puțin de 5% sunt reale. Restul sunt zgomot — reguli configurate greșit, anomalii benigne și datorii de ajustare acumulate de-a lungul anilor de proliferare a produselor punctuale. Nu este o problemă de oameni. Este o problemă de arhitectură, iar machine learning-ul este răspunsul arhitectural spre care industria a converge în ultimii cinci ani.

Această postare taie prin hype-ul furnizorilor pentru a examina cum arată cu adevărat operațiunile de securitate conduse de AI la nivel de inginerie: ce modele funcționează, unde eșuează, cum se integrează cu platformele SOAR existente și ce spun metricile despre rezultatele reale.

---

## Starea Actuală a Operațiunilor SOC

Majoritatea SOC-urilor enterprise rulează astăzi un tipar care nu s-a schimbat fundamental de la începutul anilor 2000: ingestie de jurnale într-un SIEM, scriere de reguli de corelație, generare de alerte, triaj uman. Furnizorii SIEM au adăugat căsuțe de selectare pentru „machine learning" în jurul anului 2018 — în mare parte detecție statistică de outlieri adăugată pe aceeași arhitectură.

Problemele sunt structurale:

- **Oboseala la alerte este catastrofală.** Raportul IBM din 2024 privind costul breșelor de date a plasat MTTD (Mean Time to Detect) mediu la 194 de zile. Această cifră abia s-a mișcat în ultimul deceniu, în ciuda investițiilor masive în securitate.
- **Detecția bazată pe reguli este fragilă.** Atacatorii iterează mai rapid decât pot scrie regulile analiștii. O regulă scrisă pentru un TTP cunoscut este deja depășită în momentul în care este implementată.
- **Contextul este fragmentat.** Un analist SOC care corelează manual o alertă extrage date din 6–12 console diferite. Suprasarcina cognitivă este enormă, iar rata de erori urmează.
- **Nivelul 1 este un punct de blocaj.** Analiștii de nivel de intrare petrec mai mult de 70% din timp pe triaj mecanic — muncă care ar trebui automatizată.

Trecerea la operațiuni conduse de AI nu înseamnă înlocuirea analiștilor. Înseamnă eliminarea muncii mecanice astfel încât analiștii să se poată concentra pe cele 5% care contează cu adevărat.

---

## Abordări ML: Supervizat vs. Nesupervizat

Problemele de securitate ML nu se încadrează ordonat într-o singură paradigmă. Cele două abordări dominante au puncte forte și moduri de eșec diferite.

### Învățare Supervizată: Clasificarea Alertelor

Când aveți date istorice etichetate — alerte trecute marcate ca pozitive reale sau fals pozitive — modelele supervizate pot învăța să clasifice noile alerte cu precizie ridicată. Aici încep majoritatea programelor de securitate mature.

Un pipeline practic de clasificare a alertelor arată astfel:

```python
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import precision_score, recall_score, f1_score

# Feature engineering from raw alert data
def extract_features(alert_df: pd.DataFrame) -> pd.DataFrame:
    features = pd.DataFrame()

    # Temporal features
    features["hour_of_day"] = pd.to_datetime(alert_df["timestamp"]).dt.hour
    features["day_of_week"] = pd.to_datetime(alert_df["timestamp"]).dt.dayofweek
    features["is_business_hours"] = features["hour_of_day"].between(8, 18).astype(int)

    # Alert metadata
    features["severity_encoded"] = LabelEncoder().fit_transform(alert_df["severity"])
    features["rule_id_hash"] = alert_df["rule_id"].apply(lambda x: hash(x) % 10000)

    # Source/dest features
    features["src_is_internal"] = alert_df["src_ip"].str.startswith("10.").astype(int)
    features["dst_port"] = alert_df["dst_port"].fillna(0).astype(int)

    # Historical enrichment (requires join to entity history)
    features["src_alert_count_7d"] = alert_df["src_alert_count_7d"].fillna(0)
    features["src_last_seen_days"] = alert_df["src_last_seen_days"].fillna(999)

    return features

# Train
X = extract_features(training_alerts)
y = training_alerts["is_true_positive"]
X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, stratify=y)

model = GradientBoostingClassifier(
    n_estimators=300,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    random_state=42
)
model.fit(X_train, y_train)

# Evaluate — precision matters more than accuracy in imbalanced alert data
preds = model.predict(X_val)
print(f"Precision: {precision_score(y_val, preds):.3f}")
print(f"Recall:    {recall_score(y_val, preds):.3f}")
print(f"F1:        {f1_score(y_val, preds):.3f}")
```

Perspectiva critică: **precizia contează mai mult decât recall-ul pentru suprimarea alertelor.** Un fals negativ (amenințare reală ratată) este periculos, dar aveți nevoie ca modelul să fie conservator — să suprime doar alertele despre care este extrem de sigur că sunt fals pozitive. Începeți cu un prag de confidență de 0,85+ înainte de închiderea automată.

### Învățare Nesupervizată: Detecția Anomaliilor Comportamentale

Modelele supervizate necesită date etichetate. Pentru tipare de atac noi — zero-day-uri, tehnici living-off-the-land, amenințări din interior — nu aveți etichete. Abordările nesupervizate modelează comportamentul normal și semnalează abaterile.

Tiparele dominante în producție:

**Isolation Forest** pentru telemetrie tabelară (jurnale de autentificare, fluxuri de rețea). Rapid, interpretabil, gestionează bine datele cu dimensionalitate ridicată. Parametrul de contaminare necesită ajustare atentă — prea scăzut și inundați analiștii cu anomalii.

**Autoencoder-e** pentru date secvențiale (lanțuri de execuție a proceselor, secvențe de apeluri API). Antrenate pe comportament normal; eroarea mare de reconstrucție semnalează anomalia. Mai puternice decât isolation forest pentru tipare temporale, dar semnificativ mai costisitoare de operat și explicat.

Platformele **UEBA (User and Entity Behavior Analytics)** precum Securonix și Exabeam sunt esențialmente versiuni productizate ale acestor tehnici aplicate la telemetria de identitate și acces. Modelele din spatele marketingului sunt variante de gradient boosting și autoencoder.

---

## Analitică Comportamentală la Scară

Trecerea de la detecția bazată pe reguli la detecția comportamentală necesită reconstruirea modelului de date de detecție. Regulile întreabă: *„S-a întâmplat evenimentul X?"* Analitica comportamentală întreabă: *„Această secvență de evenimente este neobișnuită pentru această entitate?"*

Aceasta necesită:

1. **Profile de entitate** — Linii de bază dinamice pentru utilizatori, gazde, conturi de servicii, segmente de rețea. Minim 30 de zile de istoric înainte ca liniile de bază să fie fiabile; 90 de zile pentru a captura variațiile sezoniere.

2. **Feature store-uri** — Funcții comportamentale pre-calculate servite la momentul interogării. Interogările de jurnale brute la momentul evaluării alertei sunt prea lente. Construiți un feature store cu funcții precum `user_avg_login_hour`, `host_peer_group_deviation`, `service_account_new_resource_access_rate`.

3. **Modelare pe grupuri de perechi** — Anomalia față de perechi este mai bogată în semnal decât anomalia față de linia de bază globală. Un dezvoltator care accesează serverul de build la ora 2 dimineața este normal. Un analist financiar care îl accesează nu este.

4. **Scoring al riscului cu decadere** — Riscul comportamental ar trebui să se acumuleze în cadrul unei sesiuni și să scadă în timp. O singură autentificare anomală urmată de activitate normală este risc scăzut. Aceeași autentificare urmată de mișcare laterală și acces în masă la fișiere este critică.

---

## NLP pentru Procesarea Informațiilor despre Amenințări

Informațiile despre amenințări ajung ca text nestructurat — avize de vulnerabilitate, rapoarte de malware, postări pe forumuri dark web, feeduri OSINT. Extragerea manuală a IOC-urilor și TTP-urilor acționabile este un job cu normă întreagă pentru o echipă.

LLM-urile și modelele NLP fine-tuned fac acest lucru tractabil. Arhitectura practică:

- Modelele de **Named Entity Recognition (NER)** fine-tuned pe corpora de securitate cibernetică (SecureBERT, CySecBERT) extrag IP-uri, hash-uri, CVE-uri, familii de malware și nume de actori din textul brut.
- **Clasificarea TTP** mapează comportamentele extrase la tehnicile MITRE ATT&CK, permitând generarea automată de reguli și analiza lacunelor de acoperire.
- **Instrumente pentru analiști augmentate cu RAG** — Analiștii SOC interogează o bază de date vectorială de rapoarte de informații despre amenințări procesate în limbaj natural. „Ce TTP-uri folosește grupul Lazarus pentru accesul inițial?" returnează răspunsuri clasificate și citate în câteva secunde.

ROI-ul este măsurabil: timpul de procesare a informațiilor despre amenințări scade de la ore la minute, iar acoperirea stratului de detecție împotriva TTP-urilor cunoscute devine auditabilă.

---

## Răspuns Autonom și Integrare SOAR

Detecția fără automatizarea răspunsului livrează doar jumătate din valoare. Întrebarea este cât de departe să împingem autonomia.

**Automatizare Nivel 1 (confidență ridicată, raza de explozie mică):** Blocarea IOC-urilor, izolarea endpoint-urilor, dezactivarea conturilor compromise, revocarea sesiunilor. Aceste acțiuni sunt reversibile și cu risc scăzut. Automatizați-le fără aprobare umană pentru detecții cu confidență ridicată.

**Automatizare Nivel 2 (confidență medie, impact mai mare):** Izolarea segmentelor de rețea, sinkholing DNS, implementarea regulilor de firewall. Necesită aprobare umană, dar pre-organizați playbook-ul astfel încât execuția să fie un singur clic.

**Nivel 3 — augmentarea investigației:** Colectare autonomă de dovezi, reconstrucția cronologiei, traversarea grafului de active. Modelul face munca de investigare; analistul ia decizia.

Integrarea cu platformele SOAR (Palo Alto XSOAR, Splunk SOAR, Tines) este stratul de execuție. Stack-ul ML alimentează cazuri îmbogățite, scored, deduplicate către SOAR, care execută playbook-uri. Arhitectura:

```
[SIEM/EDR/NDR] → [ML enrichment pipeline] → [Case management] → [SOAR playbook engine]
                         ↓
               [Alert suppression]  [Risk scoring]  [Entity linking]
```

Cerințe cheie de integrare SOAR:
- Buclă de feedback bidirecțională — dispozițiile analiștilor pe cazuri se întorc în reantrenarea modelului
- Câmpuri de explicabilitate pe fiecare alertă scored de ML (top 3 funcții contributoare, scor de confidență, cazuri istorice similare)
- Jurnalizare audit pentru toate acțiunile automatizate — regulatorii vor întreba

---

## Metrici din Lumea Reală: Ce Livrează Implementările

Prezentările furnizorilor spun „90% reducere a alertelor" și „detecție de 10 ori mai rapidă." Realitatea este mai nuanțată, dar rămâne convingătoare pentru organizațiile care fac corect munca de implementare.

Din implementările enterprise documentate:

| Metrică | Linie de bază pre-ML | Post-ML (12 luni) |
|---------|---------------------|-------------------|
| Volum zilnic de alerte (față de analist) | 1.200 | 180 |
| Rata fals pozitive | 94% | 61% |
| MTTD (zile) | 18 | 4 |
| MTTR (ore) | 72 | 11 |
| Capacitatea analistului Nivel 1 (cazuri/zi) | 22 | 85 |

Reducerea volumului de alerte este reală, dar necesită investiții: 6–9 luni de antrenare a modelului, disciplina buclei de feedback și acceptul analiștilor pentru etichetare. Organizațiile care văd îmbunătățiri de 15% sunt cele care au implementat stratul ML, dar nu au închis bucla de feedback. Etichetele slabe produc modele slabe.

---

## Provocări: ML Adversarial și Calitatea Datelor

Orice tratament onest al AI în securitate trebuie să abordeze modurile de eșec.

### ML Adversarial

Atacatorii pot sonda și otrăvi modelele de detecție. Vectorii de atac cunoscuți:

- **Atacuri de evaziune** — Modificarea treptată a comportamentului malițios pentru a rămâne sub pragurile de detecție. Tehnicile living-off-the-land sunt esențialmente evaziune artizanală împotriva detecției bazate pe semnături; modelele ML se confruntă cu aceeași provocare.
- **Otrăvirea datelor** — Dacă atacatorii pot injecta date fabricate în pipeline-urile de antrenare (de exemplu, prin endpoint-uri compromise care alimentează telemetrie), pot degrada performanța modelului în timp.
- **Inversarea modelului** — Interogarea repetată a sistemului de detecție pentru a deduce granițele de decizie.

Măsuri de atenuare: ansamblarea modelelor (mai greu de evitat toate modelele simultan), detecția tiparelor anormale de interogare împotriva API-urilor de detecție și tratarea modelelor ML ca active sensibile din punct de vedere al securității care necesită control al accesului și monitorizarea integrității.

### Calitatea Datelor

Aceasta este constrângerea fără glamour care ucide majoritatea programelor de securitate ML. Modelele de detecție sunt bune numai atât cât este telemetria pe care sunt antrenate.

Moduri comune de eșec:
- **Desincronizarea ceasului** între sursele de jurnale corupte funcțiile temporale
- **Câmpuri lipsă** în jurnale pe care modelul le tratează ca absențe semnificative
- **Lacune de colectare** — endpoint-urile care nu au raportat timp de 6 ore arată ca mașini oprite sau atacatori care acoperă urmele
- **Deriva formatului de jurnal** — o actualizare a parserului SIEM schimbă numele câmpurilor; modelul degradează silențios

Investiți în monitorizarea calității telemetriei înainte de a investi în modele. Un dashboard de sănătate a pipeline-ului care arată completitudinea câmpurilor, anomaliile de volum și disponibilitatea surselor pe tip de date este o condiție prealabilă, nu un afterthought.

---

## Traiectoria Viitoare: Următorii 36 de Luni

Direcția de evoluție este clară, chiar dacă cronologia este incertă:

**Sisteme SOC agentice** — Agenți bazați pe LLM care investighează autonom incidentele de la capăt la capăt: colectarea dovezilor, interogarea informațiilor despre amenințări, formularea ipotezelor, executarea acțiunilor de răspuns și redactarea rapoartelor de incident. Implementările timpurii în producție există astăzi la mari enterprise-uri. Reduc sarcina analiștilor pe incidentele de rutină aproape de zero.

**Rețele neuronale grafice pentru detecția mișcării laterale** — Căile de atac prin rețelele enterprise sunt probleme de graf. Detecția bazată pe GNN a tiparelor de traversare neobișnuite în Active Directory și grafurile cloud IAM va deveni standard în generația următoare de produse de securitate a identității.

**Modele de detecție federate** — Partajarea informațiilor de detecție între organizații fără a partaja telemetria brută. ISAC-urile (Information Sharing and Analysis Centers) sunt pionieri timpurii în învățarea federată pentru detecția amenințărilor. Așteptați ca aceasta să maturizeze semnificativ.

**Automatizarea continuă a red team-ului** — Sisteme adversariale autonome care sondează continuu stack-ul de detecție, generează variații noi de atac și măsoară lacunele de acoperire. Închide bucla de feedback între ofensă și apărare la viteza mașinii.

> Organizațiile care vor conduce în securitate în decursul următorului deceniu nu sunt cele cu cei mai mulți analiști sau cu cele mai multe reguli. Sunt cele care construiesc cea mai strânsă buclă de feedback între datele lor de detecție, modelele lor și sistemele lor de răspuns — și tratează acea buclă ca o disciplină inginerească de bază.

SOC-ul din 2028 va arăta ca o echipă de inginerie care rulează un sistem distribuit, nu ca un call center care gestionează o coadă de tichete. Cu cât începeți mai devreme să construiți spre acea arhitectură, cu atât veți fi mai avansați când va ajunge.
