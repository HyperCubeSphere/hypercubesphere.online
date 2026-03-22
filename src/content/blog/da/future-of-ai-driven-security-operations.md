---
title: "Fremtiden for AI-drevne sikkerhedsoperationer"
date: "2026-03-22"
author: "HyperCubeSphere Engineering"
tags: ["sikkerhed", "AI", "SOC", "maskinlæring", "trusselsdetektering"]
excerpt: "ML-modeller omformer grundlæggende, hvordan sikkerhedsoperationscentre opdager trusler, triagerer alarmer og reagerer på hændelser. Sådan ser ingeniørarbejdet ud under motorhjelmen."
---

Den gennemsnitlige SOC-analytiker i en stor virksomhed håndterer 1.000+ alarmer om dagen. Færre end 5 % er ægte. Resten er støj — fejlkonfigurerede regler, godartede anomalier og tuningsgæld akkumuleret over år med spredte punktprodukter. Dette er ikke et personproblem. Det er et arkitekturproblem, og maskinlæring er det arkitektoniske svar, som branchen har konvergeret mod i de seneste fem år.

Dette indlæg skærer igennem leverandørhypet og undersøger, hvad AI-drevne sikkerhedsoperationer faktisk ser ud som på ingeniørniveau: hvilke modeller virker, hvor de fejler, hvordan de integreres med eksisterende SOAR-platforme, og hvad metrikker siger om virkelige resultater.

---

## Den aktuelle tilstand for SOC-operationer

De fleste store virksomheders SOC'er kører i dag et mønster, der ikke har ændret sig fundamentalt siden begyndelsen af 2000'erne: indlæs logfiler i et SIEM, skriv korrelationsregler, generer alarmer, lad mennesker triagere dem. SIEM-leverandørerne tilføjede "maskinlærings"-afkrydsningsfelter omkring 2018 — mest statistisk afvigelsesdetektering boltet på den samme arkitektur.

Problemerne er strukturelle:

- **Alarmtræthed er katastrofal.** IBMs Cost of a Data Breach-rapport fra 2024 satte gennemsnitlig MTTD (Mean Time to Detect) til 194 dage. Det tal har næsten ikke rykket sig i et årti på trods af massive sikkerhedsinvesteringer.
- **Regelbaseret detektion er skrøbelig.** Angribere itererer hurtigere, end analytikere kan skrive regler. En regel skrevet til en kendt TTP er allerede forældet, når den er implementeret.
- **Kontekst er fragmenteret.** En SOC-analytiker, der korrelerer en alarm manuelt, henter data fra 6–12 forskellige konsoller. Den kognitive belastning er enorm, og fejlraten følger med.
- **Tier-1 er en flaskehals.** Analytikere på begynderniveau bruger 70 %+ af deres tid på mekanisk triagering — arbejde, der burde automatiseres.

Skiftet til AI-drevne operationer handler ikke om at erstatte analytikere. Det handler om at eliminere det mekaniske arbejde, så analytikere kan fokusere på de 5 %, der faktisk betyder noget.

---

## ML-tilgange: Overvåget vs. ikke-overvåget

Sikkerhedsmæssige ML-problemer passer ikke pænt ind i ét paradigme. De to dominerende tilgange har forskellige styrker og fejlmåder.

### Overvåget læring: Alarmklassificering

Når du har mærkede historiske data — tidligere alarmer markeret som sande positive eller falske positive — kan overvågede modeller lære at klassificere nye alarmer med høj nøjagtighed. Det er her, de fleste modne sikkerhedsprogrammer starter.

En praktisk pipeline til alarmklassificering ser sådan ud:

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

Den kritiske indsigt her: **præcision betyder mere end recall ved alarmsuppression.** Et falsk negativt (overset reel trussel) er farligt, men du har brug for, at modellen er konservativ — den undertrykker kun alarmer, som den er meget sikker på er falske positive. Start med en grænseværdi på 0,85+ konfidensgrad, inden automatisk lukning.

### Ikke-overvåget læring: Adfærdsmæssig anomalidetektering

Overvågede modeller kræver mærkede data. For nye angrebsmønstre — zero-days, living-off-the-land-teknikker, insidertrusler — har du ingen etiketter. Ikke-overvågede tilgange modellerer normal adfærd og markerer afvigelser.

De dominerende mønstre i produktion:

**Isolation Forest** til tabellarisk telemetri (autentificeringslogfiler, netværksflows). Hurtig, fortolkelig, håndterer data med høj dimension godt. Kontamineringsparameteren kræver omhyggelig justering — for lav og du oversvømmer analytikere med anomalier.

**Autoencoders** til sekvensdata (procesudførelsesskæder, API-kaldssekvenser). Trænes på normal adfærd; høj rekonstruktionsfejl signalerer anomali. Kraftigere end Isolation Forest til tidsmæssige mønstre, men betydeligt dyrere at drive og forklare.

**UEBA (User and Entity Behavior Analytics)**-platforme som Securonix og Exabeam er i bund og grund produktiserede versioner af disse teknikker anvendt på identitets- og adgangstelemetri. Modellerne bag markedsføringen er gradient boosting- og autoencoder-varianter.

---

## Adfærdsanalyse i stor skala

Skiftet fra regelbaseret til adfærdsbaseret detektion kræver, at du genopbygger din detektionsdatamodel. Regler spørger: *"Skete hændelse X?"* Adfærdsanalyse spørger: *"Er denne sekvens af hændelser usædvanlig for denne enhed?"*

Dette kræver:

1. **Enhedsprofiler** — Rullende basislinjer for brugere, værter, tjenestekonti, netværkssegmenter. Minimum 30 dages historik, inden basislinjer er pålidelige; 90 dage for at fange sæsonmæssig variation.

2. **Funktionslager** — Forudberegnede adfærdsfunktioner serveret ved forespørgselstidspunktet. Rålogforespørgsler ved alarmudvurderingstidspunktet er for langsomme. Byg et funktionslager med funktioner som `user_avg_login_hour`, `host_peer_group_deviation`, `service_account_new_resource_access_rate`.

3. **Peer-gruppemodellering** — Anomali i forhold til jævnaldrende er mere signalrig end anomali i forhold til global baslinje. En udvikler, der tilgår build-serveren kl. 2 om natten, er normalt. En økonomianalytiker, der gør det, er det ikke.

4. **Risikovurdering med forfald** — Adfærdsrisiko bør akkumuleres over en session og forfalde over tid. Et enkelt afvigende login efterfulgt af normal aktivitet er lav risiko. Det samme login efterfulgt af lateral bevægelse og massefiladgang er kritisk.

---

## NLP til behandling af trusselsintelligens

Trusselsintelligens ankommer som ustruktureret tekst — sårbarhedsadvarsler, malware-rapporter, dark web-forumindlæg, OSINT-feeds. At udtrække handlingsdygtige IOC'er og TTP'er manuelt er et fuldtidsarbejde for et team.

LLM'er og finjusterede NLP-modeller gør dette håndterbart. Den praktiske arkitektur:

- **Named Entity Recognition (NER)**-modeller finjusteret på cybersikkerhedskorpora (SecureBERT, CySecBERT) udtrækker IP-adresser, hash-værdier, CVE'er, malware-familier og aktørnavne fra råtekst.
- **TTP-klassificering** kortlægger udtrukne adfærdsmønstre til MITRE ATT&CK-teknikker, hvilket muliggør automatisk regelgenerering og analyse af dækningsgab.
- **RAG-forstærket analytiker-tooling** — SOC-analytikere forespørger en vektordatabase med behandlede trusselsintelligensrapporter på naturligt sprog. "Hvilke TTP'er bruger Lazarus Group til initial adgang?" returnerer rangordnede, citerede svar på sekunder.

ROI'en er målbar: behandlingstiden for trusselsintelligens falder fra timer til minutter, og dækningen af dit detektionslag mod kendte TTP'er bliver reviderbar.

---

## Autonom respons og SOAR-integration

Detektion uden responsautomatisering leverer kun halvdelen af værdien. Spørgsmålet er, hvor langt man skal drive autonomien.

**Tier 1-automatisering (høj konfidensgrad, lav blast radius):** Bloker IOC'er, isoler endpoints, deaktiver kompromitterede konti, tilbagekald sessioner. Disse handlinger er reversible og lavrisiko. Automatiser dem uden menneskelig godkendelse ved høj-konfidens-detekteringer.

**Tier 2-automatisering (middel konfidensgrad, højere påvirkning):** Netværkssegmentisolering, DNS-sinkholing, implementering af firewallregler. Kræver menneskelig godkendelse, men forbered spillebogen på forhånd, så udførelse er ét klik.

**Tier 3 — undersøgelsesforstærkning:** Autonom bevisindsamling, tidslinjerekonstruktion, gennemgang af aktivitetsgraf. Modellen udfører undersøgelsesarbejdet; analytikeren træffer beslutningen.

Integration med SOAR-platforme (Palo Alto XSOAR, Splunk SOAR, Tines) er udførelsesskiktet. ML-stakken mater berigede, scorede, deduplikerede sager til SOAR'en, som udfører spillebøger. Arkitekturen:

```
[SIEM/EDR/NDR] → [ML-berigningspipeline] → [Sagsstyring] → [SOAR-spillebogsmotor]
                         ↓
               [Alarmsuppression]  [Risikoscoring]  [Entitetskobling]
```

Centrale SOAR-integrationskrav:
- Tovejs feedback-løkke — analytikeres håndtering af sager fødes tilbage ind i modelomlæring
- Forklarlighedsfelter på enhver ML-scoret alarm (top 3 bidragende funktioner, konfidensgrad, lignende historiske sager)
- Revisionslogning for alle automatiserede handlinger — regulatorer vil spørge

---

## Virkelige metrikker: Hvad implementeringer faktisk leverer

Leverandørernes præsentationer siger "90 % alarmreduktion" og "10 gange hurtigere detektion." Virkeligheden er mere nuanceret, men stadig overbevisende for organisationer, der udfører implementeringsarbejdet korrekt.

Fra dokumenterede virksomhedsimplementeringer:

| Metrik | Pre-ML-baslinje | Post-ML (12 måneder) |
|--------|----------------|---------------------|
| Daglig alarmvolumen (analytiker-vendt) | 1.200 | 180 |
| Falsk positiv-rate | 94 % | 61 % |
| MTTD (dage) | 18 | 4 |
| MTTR (timer) | 72 | 11 |
| Tier-1-analytikerkapacitet (sager/dag) | 22 | 85 |

Alarmvolumenreduktionen er reel, men kræver investering: 6–9 måneder med modeltræning, disciplin om feedback-løkken og analytikernes medvirken ved mærkning. De organisationer, der ser 15 % forbedringer, er dem, der implementerede ML-laget men ikke lukkede feedback-løkken. Skrald-etiketter producerer skrald-modeller.

---

## Udfordringer: Adversarial ML og datakvalitet

Enhver ærlig behandling af AI inden for sikkerhed skal adressere fejlmåderne.

### Adversarial ML

Angribere kan probe og forgifte detektionsmodeller. Kendte angrebsvektorer:

- **Undvigelsesangreb** — Gradvist ændre ondsindet adfærd for at holde sig under detekteringstærskler. Living-off-the-land-teknikker er i bund og grund håndkraftede undvigelser mod signaturbaseret detektion; ML-modeller møder den samme udfordring.
- **Dataforgiftning** — Hvis angribere kan injicere fremstillede data i træningspipelines (f.eks. gennem kompromitterede endpoints, der mater telemetri), kan de gradvist forringe modellens ydeevne.
- **Modelinversion** — Gentagne forespørgsler til detektionssystemet for at udlede beslutningsgrænser.

Modforanstaltninger: modelensembling (sværere at undvige alle modeller simultant), detektion af afvigende forespørgselsmønstre mod dine detektions-API'er, og at behandle dine ML-modeller som sikkerhedsfølsomme aktiver, der kræver adgangskontrol og integritetovervågning.

### Datakvalitet

Dette er den ugloriøse begrænsning, der dræber de fleste ML-sikkerhedsprogrammer. Detektionsmodeller er kun så gode som den telemetri, de er trænet på.

Almindelige fejlmåder:
- **Uraffineret** på tværs af logkilder, der korrumperer tidsmæssige funktioner
- **Manglende felter** i logfiler, som modellen behandler som meningsfulde fraværelser
- **Indsamlingsgab** — endpoints, der ikke rapporterede i 6 timer, ligner slukket maskiner eller angribere, der dækker spor
- **Logformat-drift** — en SIEM-parseropdatering ændrer feltnavne; modellen forringes lydløst

Invester i telemetrikvalitetsovervågning, inden du investerer i modeller. Et pipeline-sundhedsdashboard, der viser fuldstændighed af felter, volumenanomalier og kildtilgængelighed pr. datatype, er en forudsætning, ikke en eftertanke.

---

## Fremtidig retning: De næste 36 måneder

Retningen er klar, selvom tidslinjen er usikker:

**Agentiske SOC-systemer** — LLM-baserede agenter, der autonomt undersøger hændelser fra ende til anden: indsamler beviser, forespørger trusselsintelligens, formulerer hypoteser, udfører responshandlinger og udarbejder hændelsesrapporter. Tidlige produktionsimplementeringer eksisterer hos store virksomheder i dag. De reducerer analytikerens belastning ved rutinehændelser til næsten nul.

**Graf-neurale netværk til detektion af lateral bevægelse** — Angrebsstier gennem virksomhedsnetværk er grafproblemer. GNN-baseret detektion af usædvanlige gennemkørselsmønstre i Active Directory og cloud IAM-grafer vil blive standard i næste generation af identitetssikkerhedsprodukter.

**Fødererede detektionsmodeller** — Deling af detektionsintelligens på tværs af organisationer uden at dele råtelemetri. ISAC'er (Information Sharing and Analysis Centers) er tidlige pionerer inden for fødereret læring til trusselsdetektering. Forvent, at dette modnes betydeligt.

**Kontinuerlig red team-automatisering** — Autonome adversarielle systemer, der kontinuerligt prober dit detektionsstack, genererer nye angrebsvariationer og måler dækningsgab. Lukker feedback-løkken mellem offensiv og defensiv ved maskinhastighed.

> De organisationer, der vil føre an inden for sikkerhed i det næste årti, er ikke dem med flest analytikere eller flest regler. Det er dem, der bygger den tætteste feedback-løkke mellem deres detektionsdata, deres modeller og deres responssystemer — og behandler den løkke som en central ingeniørdisciplin.

SOC'en i 2028 vil ligne et ingeniørteam, der driver et distribueret system, ikke et callcenter, der styrer en sagskø. Jo hurtigere du begynder at bygge mod den arkitektur, desto længere fremme vil du være, når den ankommer.
