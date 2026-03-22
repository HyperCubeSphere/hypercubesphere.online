---
title: "Yapay Zeka Destekli Güvenlik Operasyonlarının Geleceği"
date: "2026-03-22"
author: "HyperCubeSphere Engineering"
tags: ["güvenlik", "yapay zeka", "SOC", "makine öğrenmesi", "tehdit tespiti"]
excerpt: "ML modelleri, güvenlik operasyon merkezlerinin tehditleri tespit etme, uyarıları önceliklendirme ve olaylara müdahale etme biçimini temelden yeniden şekillendiriyor. İşte altta yatan mühendislik katmanının görünümü."
---

Ortalama bir kurumsal SOC analisti günde 1.000'den fazla uyarı işler. Bunların yüzde beşinden azı gerçektir. Geri kalanı gürültüdür: yanlış yapılandırılmış kurallar, zararsız anomaliler ve yıllarca biriken ayarlama borcu. Bu bir insan sorunu değildir; mimari bir sorundur ve makine öğrenmesi, sektörün son beş yıldır yakınsadığı mimari yanıttır.

Bu yazı, satıcı abartılarını bir kenara bırakarak yapay zeka destekli güvenlik operasyonlarının mühendislik düzeyinde gerçekte neye benzediğini inceliyor: hangi modellerin işe yaradığını, nerede başarısız olduklarını, mevcut SOAR platformlarıyla nasıl entegre edildiklerini ve gerçek dünya sonuçlarına ilişkin ölçümlerin neler söylediğini ele alıyor.

---

## SOC Operasyonlarının Mevcut Durumu

Kurumsal SOC'lerin büyük çoğunluğu, temelden 2000'lerin başından bu yana değişmemiş bir modeli işletiyor: günlükleri bir SIEM'e alın, korelasyon kuralları yazın, uyarılar üretin ve insanların bunları önceliklendirmesini bekleyin. SIEM satıcıları 2018 civarında "makine öğrenmesi" onay kutularını ekledi; bunlar büyük ölçüde aynı mimariye monte edilmiş istatistiksel aykırı değer tespitinden ibaretti.

Sorunlar yapısaldır:

- **Uyarı yorgunluğu felakete dönüşmüştür.** IBM'in 2024 Veri İhlali Maliyeti raporu, ortalama MTTD'yi (Ortalama Tespit Süresi) 194 gün olarak belirledi. Bu rakam, muazzam güvenlik yatırımlarına karşın on yıl içinde neredeyse hiç değişmedi.
- **Kural tabanlı tespit kırılgandır.** Saldırganlar, analistlerin kural yazabileceğinden daha hızlı yineleme yapar. Bilinen bir TTP için yazılmış kural, devreye alındığında zaten güncelliğini yitirmiş olur.
- **Bağlam parçalanmıştır.** Bir uyarıyı elle ilişkilendiren SOC analisti 6 ile 12 farklı konsoldan veri çeker. Bilişsel yük muazzamdır ve hata oranı buna paralel seyreder.
- **1. Kademe bir darboğazdır.** Giriş seviyesi analistler zamanlarının yüzde 70'inden fazlasını mekanik önceliklendirmeye harcar; bu, otomatize edilmesi gereken bir iştir.

Yapay zeka destekli operasyonlara geçiş, analistlerin yerini almakla ilgili değildir. Asıl önemli olan yüzde 5'e odaklanabilmeleri için mekanik işlerin ortadan kaldırılmasıyla ilgilidir.

---

## ML Yaklaşımları: Denetimli ve Denetimsiz

Güvenlik ML problemleri tek bir paradigmaya tam olarak uymaz. İki baskın yaklaşımın farklı güçlü yönleri ve başarısızlık biçimleri vardır.

### Denetimli Öğrenme: Uyarı Sınıflandırması

Geçmiş uyarıların gerçek pozitif veya yanlış pozitif olarak etiketlendiği etiketli tarihsel verilere sahip olduğunuzda, denetimli modeller yeni uyarıları yüksek doğrulukla sınıflandırmayı öğrenebilir. Olgun güvenlik programlarının çoğu buradan başlar.

Pratik bir uyarı sınıflandırma iş akışı şöyle görünür:

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

Buradaki kritik içgörü: **Uyarı baskılama için kesinlik, geri çağırmadan daha önemlidir.** Yanlış negatif (kaçırılan gerçek tehdit) tehlikelidir; ancak modelin muhafazakâr olması gerekir: yalnızca yanlış pozitif olduğundan yüksek güvenle emin olduğu uyarıları baskılamalıdır. Otomatik kapatma için 0,85 ve üzeri güven eşiğiyle başlayın.

### Denetimsiz Öğrenme: Davranışsal Anomali Tespiti

Denetimli modeller etiketli veri gerektirir. Sıfır gün açıkları, arazide yaşayan teknikler ve içeriden tehditler gibi yeni saldırı kalıpları için etiketlere sahip değilsinizdir. Denetimsiz yaklaşımlar normal davranışı modelleyerek sapmalar saptar.

Üretimdeki baskın kalıplar:

**Isolation Forest**, tablo biçimindeki telemetri (kimlik doğrulama günlükleri, ağ akışları) için uygundur. Hızlı, yorumlanabilir ve yüksek boyutlu verilerle iyi başa çıkar. Kirlilik parametresi dikkatli bir ayarlama gerektirir; çok düşük ayarlanırsa analistleri anomalilerle boğar.

**Otokodlayıcılar**, sıralı veriler (süreç yürütme zincirleri, API çağrı dizileri) için uygundur. Normal davranış üzerinde eğitilirler; yüksek yeniden yapılanma hatası anomaliyi işaret eder. Zamansal kalıplar için Isolation Forest'tan daha güçlüdür; ancak işletmesi ve açıklaması önemli ölçüde daha pahalıdır.

**UEBA (Kullanıcı ve Varlık Davranış Analitiği)** platformları olan Securonix ve Exabeam, özünde bu tekniklerin kimlik ve erişim telemetrisine uygulanmış ürün haline getirilmiş versiyonlarıdır. Pazarlamanın arkasındaki modeller, gradyan artırma ve otokodlayıcı varyantlarıdır.

---

## Ölçekte Davranışsal Analitik

Kural tabanlıdan davranışsal tespite geçiş, tespit veri modelinizi yeniden inşa etmeyi gerektirir. Kurallar şunu sorar: *"X olayı gerçekleşti mi?"* Davranışsal analitik ise şunu sorar: *"Bu varlık için bu olay dizisi olağandışı mı?"*

Bu şunları gerektirir:

1. **Varlık profilleri** — Kullanıcılar, ana bilgisayarlar, hizmet hesapları ve ağ segmentleri için yuvarlanan taban çizgileri. Taban çizgileri güvenilir olmadan önce en az 30 günlük geçmişe ihtiyaç vardır; mevsimsel değişimi yakalamak için 90 gün gereklidir.

2. **Özellik depoları** — Sorgu anında sunulan önceden hesaplanmış davranışsal özellikler. Uyarı değerlendirme anında ham günlük sorguları çok yavaştır. `user_avg_login_hour`, `host_peer_group_deviation`, `service_account_new_resource_access_rate` gibi özelliklerle bir özellik deposu oluşturun.

3. **Akran grubu modellemesi** — Akranlara göre anomali, küresel taban çizgisine göre anomaliden daha fazla sinyal içerir. Bir geliştiricinin gece 2'de derleme sunucusuna erişmesi normaldir. Bir finans analistinin erişmesi ise değildir.

4. **Azalmayla risk puanlaması** — Davranışsal risk, bir oturum boyunca birikebilmeli ve zamanla azalabilmelidir. Normal aktiviteyi izleyen tek bir anormal giriş düşük risktir. Yanal hareket ve toplu dosya erişimiyle izlenen aynı giriş kritiktir.

---

## Tehdit İstihbaratı İşleme için NLP

Tehdit istihbaratı yapılandırılmamış metin olarak gelir: güvenlik açığı tavsiyeleri, zararlı yazılım raporları, karanlık web forum gönderileri, OSINT beslemeleri. Eyleme dönüştürülebilir IOC'leri ve TTP'leri elle çıkarmak, bir ekip için tam zamanlı bir iştir.

LLM'ler ve ince ayarlı NLP modelleri bunu uygulanabilir kılıyor. Pratik mimari:

- **Adlandırılmış Varlık Tanıma (NER)** modelleri, siber güvenlik derlemleri üzerinde ince ayar yapılmış (SecureBERT, CySecBERT) olarak ham metinden IP'leri, hash'leri, CVE'leri, zararlı yazılım ailelerini ve aktör adlarını çıkarır.
- **TTP sınıflandırması**, çıkarılan davranışları MITRE ATT&CK tekniklerine eşleyerek otomatik kural oluşturmayı ve kapsam boşluğu analizini mümkün kılar.
- **RAG destekli analist araçları** — SOC analistleri, işlenmiş tehdit istihbaratı raporlarından oluşan bir vektör veritabanını doğal dilde sorgular. "Lazarus Group ilk erişim için hangi TTP'leri kullanıyor?" sorusu saniyeler içinde sıralanmış, alıntılanmış yanıtlar döndürür.

Yatırım getirisi ölçülebilirdir: tehdit istihbaratı işleme süresi saatlerden dakikalara düşer ve bilinen TTP'lere karşı tespit katmanınızın kapsamı denetlenebilir hale gelir.

---

## Otonom Müdahale ve SOAR Entegrasyonu

Müdahale otomasyonu olmayan tespit yalnızca değerin yarısını sunar. Asıl soru, özerkliği ne kadar ileri götüreceğinizdir.

**1. Kademe otomasyon (yüksek güven, düşük patlama yarıçapı):** IOC'leri engelleme, uç noktaları izole etme, güvenliği ihlal edilmiş hesapları devre dışı bırakma, oturumları iptal etme. Bu eylemler geri döndürülebilir ve düşük risklidir. Yüksek güvenli tespitler için insan onayı olmadan otomatize edin.

**2. Kademe otomasyon (orta güven, daha yüksek etki):** Ağ segmenti izolasyonu, DNS batırma, güvenlik duvarı kuralı dağıtımı. İnsan onayı gerektir, ancak yürütme tek bir tıklama olacak şekilde oyun kitabını önceden hazırla.

**3. Kademe — soruşturma destekleme:** Otonom kanıt toplama, zaman çizelgesi yeniden yapılandırması, varlık grafı geçişi. Model soruşturma işini yapar; analist kararı verir.

SOAR platformlarıyla entegrasyon (Palo Alto XSOAR, Splunk SOAR, Tines), yürütme katmanıdır. ML yığını zenginleştirilmiş, puanlanmış, tekilleştirilmiş vakaları SOAR'a besler ve SOAR oyun kitaplarını yürütür. Mimari:

```
[SIEM/EDR/NDR] → [ML zenginleştirme hattı] → [Vaka yönetimi] → [SOAR oyun kitabı motoru]
                         ↓
               [Uyarı baskılama]  [Risk puanlaması]  [Varlık bağlantısı]
```

Temel SOAR entegrasyon gereksinimleri:
- Çift yönlü geri bildirim döngüsü — analistlerin vakalara ilişkin kararları model yeniden eğitimine beslenmelidir
- Her ML puanlı uyarıda açıklanabilirlik alanları (en önemli 3 katkıda bulunan özellik, güven puanı, benzer geçmiş vakalar)
- Tüm otomatik eylemler için denetim günlükleme — düzenleyiciler soracaktır

---

## Gerçek Dünya Ölçümleri: Uygulamalar Gerçekte Ne Sunar?

Satıcı sunum paketleri "yüzde 90 uyarı azaltması" ve "10 kat daha hızlı tespit" söyler. Gerçek daha nüanslıdır; ancak uygulama çalışmasını doğru yapan kuruluşlar için yine de ikna edicidir.

Belgelenmiş kurumsal dağıtımlardan:

| Metrik | ML Öncesi Taban Çizgisi | ML Sonrası (12 ay) |
|--------|------------------------|--------------------|
| Günlük uyarı hacmi (analist tarafı) | 1.200 | 180 |
| Yanlış pozitif oranı | %94 | %61 |
| MTTD (gün) | 18 | 4 |
| MTTR (saat) | 72 | 11 |
| 1. Kademe analist kapasitesi (vaka/gün) | 22 | 85 |

Uyarı hacmindeki azalma gerçektir, ancak yatırım gerektirir: 6-9 aylık model eğitimi, geri bildirim döngüsü disiplini ve etiketleme konusunda analist katılımı. Yüzde 15 iyileştirme gören kuruluşlar, ML katmanını devreye alan ancak geri bildirim döngüsünü kapatmayan kuruluşlardır. Çöp etiketler çöp modeller üretir.

---

## Zorluklar: Hasım ML ve Veri Kalitesi

Güvenlikte yapay zekanın herhangi bir dürüst değerlendirmesi, başarısızlık biçimlerini ele almalıdır.

### Hasım ML

Saldırganlar tespit modellerini yoklayabilir ve zehirleyebilir. Bilinen saldırı vektörleri:

- **Kaçınma saldırıları** — Tespit eşiklerinin altında kalmak için kötü amaçlı davranışı kademeli olarak değiştirme. Arazide yaşayan teknikler, özünde imza tabanlı tespite karşı elle hazırlanmış kaçınmadır; ML modelleri aynı zorlukla karşı karşıyadır.
- **Veri zehirleme** — Saldırganlar eğitim hatlarına hazırlanmış veri enjekte edebilirse (ör. telemetri besleyen güvenliği ihlal edilmiş uç noktalar aracılığıyla), model performansını zamanla düşürebilirler.
- **Model tersine mühendislik** — Karar sınırlarını çıkarmak için tespit sistemini tekrar tekrar sorgulama.

Hafifletme önlemleri: model toplulukları (tüm modelleri aynı anda atlatmak daha zordur), tespit API'lerinize karşı anormal sorgu kalıplarının tespiti ve ML modellerinizin kendisini erişim kontrolü ve bütünlük izlemesi gerektiren güvenlik açısından hassas varlıklar olarak ele almak.

### Veri Kalitesi

Bu, çoğu ML güvenlik programını öldüren göz alıcı olmayan kısıtlamadır. Tespit modelleri ancak eğitildikleri telemetri kadar iyidir.

Yaygın başarısızlık biçimleri:
- Günlük kaynakları arasındaki **saat kayması** zamansal özellikleri bozar
- Modelin anlamlı yokluklar olarak ele aldığı günlüklerdeki **eksik alanlar**
- **Toplama boşlukları** — 6 saat boyunca rapor vermeyen uç noktalar, kapatılmış makineler veya izlerini kapatan saldırganlar gibi görünür
- **Günlük biçimi kayması** — bir SIEM ayrıştırıcı güncellemesi alan adlarını değiştirir; model sessizce bozunur

Modellere yatırım yapmadan önce telemetri kalite izlemesine yatırım yapın. Alan eksiksizliğini, hacim anomalilerini ve veri türüne göre kaynak kullanılabilirliğini gösteren bir hat sağlığı gösterge panosu, bir sonraki düşünce değil, bir ön koşuldur.

---

## Gelecekteki Yön: Önümüzdeki 36 Ay

Zaman çizelgesi belirsiz olsa da seyahat yönü açıktır:

**Otonom SOC sistemleri** — Olayları uçtan uca özerk olarak soruşturan LLM tabanlı ajanlar: kanıt toplama, tehdit istihbaratını sorgulama, hipotezler oluşturma, müdahale eylemlerini yürütme ve olay raporlarını taslak olarak hazırlama. Erken üretim dağıtımları bugün büyük kuruluşlarda mevcuttur. Rutin olaylarda analist yükünü neredeyse sıfıra indirirler.

**Yanal hareket tespiti için grafik sinir ağları** — Kurumsal ağlar üzerindeki saldırı yolları grafik problemleridir. Active Directory ve bulut IAM graflarında olağandışı geçiş kalıplarının GNN tabanlı tespiti, kimlik güvenlik ürünlerinin bir sonraki neslinde standart hale gelecektir.

**Birleşik tespit modelleri** — Ham telemetriyi paylaşmadan kuruluşlar arasında tespit istihbaratının paylaşılması. ISAC'lar (Bilgi Paylaşımı ve Analiz Merkezleri), tehdit tespiti için birleşik öğrenmenin erken benimseyenleridir. Bunun önemli ölçüde olgunlaşması beklenmektedir.

**Sürekli kırmızı takım otomasyonu** — Tespit yığınınızı sürekli olarak yoklayan, yeni saldırı varyasyonları üreten ve kapsam boşluklarını ölçen otonom hasım sistemler. Makine hızında saldırı ve savunma arasındaki geri bildirim döngüsünü kapatır.

> Önümüzdeki on yılda güvenlikte öncü olacak kuruluşlar, en fazla analistle veya en fazla kuralla donanmış olanlar değildir. Tespit verileri, modelleri ve müdahale sistemleri arasında en sıkı geri bildirim döngüsünü kuran ve bu döngüyü temel bir mühendislik disiplini olarak ele alan kuruluşlardır.

2028'in SOC'u, bir bilet kuyruğunu yöneten bir çağrı merkezi değil, dağıtılmış bir sistemi işleten bir mühendislik ekibi gibi görünecektir. Bu mimariye doğru inşa etmeye ne kadar erken başlarsanız, o mimari geldiğinde o kadar önde olacaksınızdır.
