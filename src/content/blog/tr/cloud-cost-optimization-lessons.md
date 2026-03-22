---
title: "Bulut Maliyet Optimizasyonu: 50'den Fazla Geçişten Çıkarılan Dersler"
description: "Güvenilirlikten ödün vermeden bulut harcamalarını yüzde 30-50 nasıl azaltırsınız. Doğru boyutlandırma, rezerv kapasite stratejisi, ARM benimsemesi, depolama katmanlama, FinOps uygulamaları ve Kubernetes maliyet kontrolünü kapsayan pratisyen rehberi."
date: "2025-12-03"
author: "HyperCubeSphere Engineering"
tags: ["bulut", "finops", "maliyet-optimizasyonu", "aws", "kubernetes", "devops"]
---

Bulut faturaları, kurumsal yazılım lisans tuzağının modern eşdeğeridir. Küçük başlarsınız, büyüme harcamayı meşrulaştırır, mühendisler maliyet yerine hız için optimize eder ve CFO soruyu sorduğunda, aynı yükü 400.000 dolara taşıyabilecek altyapı için aylık 800.000 dolar harcıyorsunuzdur.

50'den fazla organizasyonda maliyet optimizasyonu çalışmaları yürüttük — aylık 15.000 dolarlık AWS faturasına sahip 8 kişilik girişimlerden çok bulut genelinde aylık 3 milyon dolar harcayan Fortune 500 kuruluşlarına kadar. İsrafı yaratan desenler dikkat çekici biçimde tutarlıdır. Onu ortadan kaldıran müdahaleler de öyle.

Bu, genel ipuçlarının listesi değildir. Gerçek rakamları olan yapılandırılmış bir metodoloji.

## Taban Çizgisi: "Normal" İsraf Neye Benziyor

Çözümleri sunmadan önce, muhtemelen ne ile karşı karşıya olduğunuzu ortaya koyalım. Deneyimlerimize göre kuruluşlar üç israf profiline giriyor:

**Profil A — Reaktif Ölçekleyici (kuruluşların yüzde 40'ı)**
Olaylara karşılık sağlanan altyapı. Her şey "sadece ihtimale karşı" fazla boyutlandırılmış. Tipik israf: toplam faturanın yüzde 35-50'si.

**Profil B — Büyüme Artefaktı (kuruluşların yüzde 45'i)**
Önceki bir ölçekte mantıklı olan, mimari geliştikçe hiçbir zaman doğru boyutlandırılmamış altyapı. Tipik israf: toplam faturanın yüzde 20-35'i.

**Profil C — Yönetilen Yayılma (kuruluşların yüzde 15'i)**
Birden fazla ekip, birden fazla hesap, tutarsız etiketleme, gölge BT. Taban çizgisi oluşturmak bile zor. Tipik israf: toplam faturanın yüzde 25-45'i.

Kuruluşların büyük çoğunluğu B ve C'nin bir kombinasyonudur.

> **Yüzde 30-50 azaltma rakamı özlemsel değildir. Son 18 ay içinde resmi bir optimizasyon programı uygulamayan herhangi bir kuruluşa sistematik metodoloji uygulamanın tutarlı sonucudur.**

## Aşama 1: Hareketten Önce Görünürlük

En yaygın tek optimizasyon hatası, tam görünürlüğe sahip olmadan harekete geçmektir. Ekipler birkaç EC2 örneğini doğru boyutlandırır, aylık 3.000 dolar tasarruf eder ve zafer ilan eder — 50.000 dolarlık aylık S3 depolama maliyetleri, bağlı olmayan EBS hacimleri ve boştaki RDS örnekleri ele alınmadan.

### Etiketleme Stratejisi: Her Şeyin Temeli

Atfedemeediğinizi optimize edemezsiniz. Başka herhangi bir eylemden önce zorunlu bir etiketleme şeması uygulayın:

| Etiket Anahtarı | Zorunlu | Örnek Değerler |
|---|---|---|
| `Environment` | Evet | `production`, `staging`, `dev`, `sandbox` |
| `Team` | Evet | `platform`, `product`, `data-eng` |
| `Service` | Evet | `api-gateway`, `worker-payments`, `ml-inference` |
| `CostCenter` | Evet | `cc-4421`, `cc-engineering` |
| `ManagedBy` | Evet | `terraform`, `helm`, `manual` |
| `Criticality` | Evet | `critical`, `standard`, `low` |
| `DataClassification` | Varsa | `pii`, `confidential`, `public` |

Bunu Hizmet Kontrol Politikaları (AWS) veya Organizasyon Politikası (GCP) aracılığıyla zorunlu kılın. Etiketleme uyumluluğunu karşılamayan kaynaklar sağlanamaz olmalıdır. Bu bürokratik değildir — FinOps için ön koşuldur.

### Maliyet Anomali Tespiti

Başka bir şey yapmadan önce maliyet anomali tespitini kurun. AWS Maliyet Anomali Tespiti, GCP Bütçe Uyarıları veya Azure Maliyet Uyarılarının hepsi bunu yerel olarak sunar. Şu uyarıları yapılandırın:
- Hizmet başına haftalık yüzde 10 artış
- Ekip/maliyet merkezi başına mutlak eşikler
- Örnek türü harcama artışları

Deneyimlerimize göre anomali tespiti, her tek çalışmada ilk 30 gün içinde yapılandırmasına harcanan zamanı karşılıyor.

## Aşama 2: İşlem Doğru Boyutlandırma

İşlem (EC2, GKE düğümleri, AKS VM'ler, Lambda) genellikle toplam bulut harcamasının yüzde 40-60'ını temsil eder. Doğru boyutlandırma, en büyük mutlak dolar tasarruflarının yaşandığı yerdir.

### Doğru Boyutlandırma Metodolojisi

Hiçbir zaman ortalama kullanıma göre doğru boyutlandırmayın. İş yükü kritikliğine göre uygulanan başlık marjıyla **30 günlük bir pencere üzerinden P95 kullanımına** göre boyutlandırın:

| İş Yükü Türü | P95 CPU Hedefi | P95 Bellek Hedefi | Başlık Marjı |
|---|---|---|---|
| Durumsuz API | yüzde 60-70 | yüzde 70-80 | yüzde 30-40 |
| Arka plan çalışanı | yüzde 70-80 | yüzde 75-85 | yüzde 20-30 |
| Veritabanı | yüzde 40-60 | yüzde 80-90 | yüzde 40-60 |
| Toplu/ML çıkarımı | yüzde 85-95 | yüzde 85-95 | yüzde 5-15 |
| Geliştirme/hazırlık | yüzde 80-90 | yüzde 80-90 | yüzde 10-20 |

En yaygın doğru boyutlandırma hatası: durumsuz API'ler için tasarlanmış CPU başlık marjı hedeflerini veritabanlarında kullanmak. Veritabanı örneği, bir API sunucusundan çok daha düşük CPU kullanımında çalışmalıdır — önemli olan bellek ve IOPS başlık marjıdır.

### ARM/Graviton Benimsemesi: Tek En Yüksek YG Değişikliği

AWS Graviton3 örnekleri (M7g, C7g, R7g aileleri), aynı veya daha düşük maliyetle eşdeğer x86 Intel/AMD örneklerine kıyasla **yüzde 20-40 daha iyi fiyat-performans** sunar. Bu, bugün mevcut en güvenilir, en düşük riskli optimizasyondur.

**Yakın tarihli bir çalışmadan gerçek rakamlar:**

| Örnek Türü | vCPU | Bellek | İsteğe Bağlı Fiyat | Graviton Eşdeğeri | Graviton Fiyatı | Tasarruf |
|---|---|---|---|---|---|---|
| `m5.2xlarge` | 8 | 32 GiB | 0,384 $/sa | `m7g.2xlarge` | 0,3264 $/sa | yüzde 15 |
| `c5.4xlarge` | 16 | 32 GiB | 0,680 $/sa | `c7g.4xlarge` | 0,5808 $/sa | yüzde 15 |
| `r5.2xlarge` | 8 | 64 GiB | 0,504 $/sa | `r7g.2xlarge` | 0,4284 $/sa | yüzde 15 |

Doğrudan maliyet azaltımını performans iyileştirmesiyle (çoğu zaman daha az veya daha küçük örnek çalıştırmanıza izin verir) birleştirdiğinizde, işlemdeki etkin tasarruf yüzde 30-40'a ulaşabilir.

Konteynerleştirilmiş iş yükleri için geçiş yolu basittir: temel görüntülerinizi ARM uyumlu varyantlara güncelleyin (büyük Docker Hub görüntülerinin çoğu artık çok mimari manifestler yayınlar), EC2 örnek türlerinizi güncelleyin, yeniden derleyin. Node.js, Python, Java ve Go iş yüklerinin büyük çoğunluğu kod değişikliği olmadan Graviton'da çalışır.

### Rezerv ve Spot Stratejisi

Satın alma modeli kararı, pek çok kuruluşun masada önemli miktarda para bıraktığı yerdir. Çerçeve:

**İsteğe Bağlı:** Öngörülemeyen iş yükleri, boyutlandırmanın belirsiz olduğu yeni hizmetler ve henüz karakterize etmediğiniz her şey için kullanın.

**Rezerv Örnekler (1 yıl):** 6+ aydır çalıştırdığınız tüm taban işlem için uygulayın. Taahhüt, göründüğünden daha düşük risklidir — 1 yıllık RI'lar 7-8 ayda isteğe bağlı karşısında başa baş gelir. m7g.2xlarge için, ön ödeme olmaksızın 1 yıllık RI: saatlik 0,2286 $ karşı isteğe bağlı 0,3264 $. **Yüzde 30 tasarruf, sıfır risk değişikliği.**

**Spot Örnekler:** Hata toleranslı, kesinti toleranslı iş yükleri için uygulayın: toplu işleme, ML eğitimi, veri hatları, CI/CD derleme ajanları. Spot fiyatlandırma isteğe bağlının yüzde 70-90 altında seyreder. Kesinti oranı örnek ailesine ve bölgeye göre değişir, ancak bunun için oluşturulmuş iş yükleri için Spot dönüştürücüdür.

**Kubernetes için pratik Spot yapılandırması:**

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

## Aşama 3: Depolama Katmanlama

Depolama maliyetleri sessizce büyüdüğü için sinsi bir yapıya sahiptir. Kimsenin erişmediği günlüklerle dolu S3 kovası kimseyi endişelendirmez — aylık 40.000 dolara ulaşana kadar.

### S3 Akıllı Katmanlama

Erişim desenlerinin bilinmediği veya karma olduğu tüm kovalar için S3 Akıllı Katmanlama'yı etkinleştirin. Hizmet, nesneleri geri alma maliyeti olmadan katmanlar arasında otomatik olarak taşır:

- **Sık Erişim katmanı**: Standart fiyatlandırma
- **Seyrek Erişim katmanı**: Yüzde 40 daha düşük depolama maliyeti (30 günlük erişim yokluğunun ardından)
- **Arşiv Anında Erişim**: Yüzde 68 daha düşük (90 günden sonra)
- **Derin Arşiv**: Yüzde 95 daha düşük (180 günden sonra)

Çoğu günlükleme, artefakt ve yedekleme kovası için Akıllı Katmanlama, özelliği etkinleştirmenin ötesinde sıfır mühendislik çabasıyla 90 gün içinde depolama maliyetlerini yüzde 40-60 azaltır.

### EBS ve Veritabanı Depolama Denetimi

Aylık denetim yapın:
- **Bağlı olmayan EBS hacimleri** — bağlı bir örnek olmaksızın var olan hacimler. Bunlar saf israftır ve genellikle örnek sonlandırmasının ardından geride kalır. Ortalama olarak EBS harcamasının yüzde 8-15'inin bağlı olmayan hacimler olduğunu görürüz.
- **Fazla boyutlandırılmış RDS depolama** — RDS depolaması yukarı doğru otomatik ölçeklendirilir ancak hiçbir zaman aşağı doğru ölçeklendirilmez. Ayrılmış ile kullanılan depolamayı denetleyin.
- **Anlık görüntü birikimi** — hiçbir zaman temizlenmeyen, bazen yıllarca geriye giden anlık görüntüler. Yaşam döngüsü politikaları belirleyin.

## Aşama 4: Kubernetes Maliyet Optimizasyonu

Kubernetes kümeleri, hem yukarı hem aşağı maliyet çarpanlarıdır. İyi yapılandırıldığında kutu paketleme verimliliği ve Spot kullanımı, Kubernetes'i eşdeğer bağımsız örneklerden önemli ölçüde daha ucuz kılar. Kötü yapılandırıldığında Kubernetes kümeleri yüzde 20-30 kullanımda boş kalır ve ölçekte para israf eder.

### Kaynak İsteği ve Limit Disiplini

En yaygın Kubernetes maliyet sorunu: limitlere eşit ayarlanan kaynak istekleri, her ikisi de temkinli biçimde yüksek.

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

Zamanlayıcı kararları **isteklere** göre alınır, limitlere göre değil. Fazla boyutlandırılmış istekler kötü kutu paketlemeye neden olur, yani daha fazla düğüme ihtiyaç duyarsınız. Gerçek kullanım verilerini toplamak için VPA'yı (Dikey Pod Otomatik Ölçekleyici) öneri modunda kullanın, ardından isteklerinizi buna göre doğru boyutlandırın.

### Ad Alanı Düzeyinde Maliyet Görünürlüğü

OpenCost veya Kubecost kullanarak ad alanı düzeyinde maliyet dağılımı uygulayın. Ad alanlarını ekiplerle eşleyin. Ekip başına haftalık maliyet raporları yayınlayın. Maliyet görünürlüğünden kaynaklanan davranış değişikliği — mühendisler ekiplerinin altyapı harcamalarını gördükçe — herhangi bir teknik müdahale olmaksızın sürekli olarak yüzde 10-15 azalmaya yol açar.

## Aşama 5: Sürekli Uygulama Olarak FinOps

Tek seferlik optimizasyon çalışmaları tek seferlik sonuçlar üretir. Yüzde 30-50 daha düşük bulut maliyetlerini sürdüren kuruluşlar, maliyet verimliliğini periyodik bir denetim değil, mühendislik disiplini olarak ele alır.

### FinOps İşletme Modeli

**Haftalık:**
- Mühendislik liderlerine otomatik maliyet anomali raporu
- Yeni etiketsiz kaynak uyarıları
- Spot kesinti oranı incelemesi

**Aylık:**
- Bütçeye karşı ekip başına maliyet raporu
- Doğru boyutlandırma önerileri (AWS Compute Optimizer veya eşdeğeri aracılığıyla otomatik)
- Rezerv Örnek kapsamı incelemesi
- Bağlı olmayan kaynak taraması

**Üç Aylık:**
- RI yenileme ve kapsam stratejisi incelemesi
- Yüksek harcamalı hizmetler için mimari maliyet incelemesi
- İş değeri birimi başına harcama karşılaştırması (istek başına maliyet, kullanıcı başına maliyet, işlem başına maliyet)

Birim ekonomi karşılaştırması en önemli metriktir. Mutlak bulut harcaması işletmeniz büyüdükçe artacaktır. **İş değeri birimi başına maliyet** zamanla azalmalıdır. Azalmıyorsa, büyüdüğünüzden daha hızlı verimsizlik biriktiriyorsunuzdur.

### Çok Bulutlu Arbitraj

Birden fazla bulut üzerinde iş yükleri çalıştıran kuruluşlar için, sağlayıcılar arasındaki spot fiyatlandırma arbitrajı ek tasarruf sağlayabilir. Bu, iş yükü taşınabilirliği (konteynerler, S3 uyumlu API'ler aracılığıyla bulut bağımsız nesne depolama) ve operasyonel karmaşıklık ekleme isteği gerektirir.

Ekonomi önemli olabilir: ML iş yükleri için GPU işlem, herhangi bir anda AWS, GCP ve Azure arasında yüzde 20-40 oranında değişir ve aynı temel donanım nesli için sağlayıcılar arasında spot/önalınabilir fiyatlandırma farkı yüzde 60'a ulaşabilir.

Çok bulutlu arbitrajda başa baş, operasyonel yükü meşrulaştırmadan önce genellikle GPU harcamasında 200.000 $/ay'dan fazla gerektirir. Bu eşiğin altında tek bir sağlayıcıya bağlı kalın ve orada optimize edin.

## Yüzde 30-50 Gerçekte Nasıl Görünür

Temsili bir çalışma: Seri B SaaS şirketi, aylık 240.000 dolarlık AWS faturası, 40 kişilik mühendislik ekibi.

**90 gün içinde alınan eylemler:**

1. Etiketleme zorunluluğu ve anomali tespit kurulumu: 2 hafta
2. Tüm durumsuz iş yükleri için Graviton geçişi: 3 hafta, aylık 18.000 dolar tasarruf
3. Compute Optimizer önerilerine göre doğru boyutlandırma: 2 hafta, aylık 22.000 dolar tasarruf
4. CI/CD ve toplu iş yükleri için Spot benimsemesi: 1 hafta, aylık 14.000 dolar tasarruf
5. S3 Akıllı Katmanlama ve anlık görüntü yaşam döngüsü politikaları: 1 hafta, aylık 8.000 dolar tasarruf
6. İstikrarlı işlem taban çizgisi için 1 yıllık RI satın alımı: aylık 19.000 dolar tasarruf
7. Kubernetes kaynak isteği doğru boyutlandırması: 2 hafta, aylık 11.000 dolar tasarruf

**Toplam: aylık 92.000 dolar azalma. Orijinal faturanın yüzde 38'i. Çalışma maliyetinin geri ödeme süresi: 3 hafta.**

Mühendisler disiplini içselleştirdikçe ve FinOps işletme modeli birikmeden önce yeni israfı yakaladıkça azalmalar zamanla bileşik büyür.

Bulut maliyet optimizasyonu bir maliyet kesme egzersizi değildir. Mühendislik mükemmelliği disiplinidir. Bu şekilde davranan kuruluşlar, önemli olduğunda rakiplere üstün yatırım yapmalarını sağlayan maliyet yapısını oluşturur.
