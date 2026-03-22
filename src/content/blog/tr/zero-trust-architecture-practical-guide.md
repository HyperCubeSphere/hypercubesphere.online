---
title: "Sıfır Güven Mimarisi: Pratik Bir Uygulama Rehberi"
date: "2026-03-22"
author: "HyperCubeSphere Engineering"
tags: ["sıfır güven", "güvenlik", "mimari", "ağ", "kimlik"]
excerpt: "Sıfır güven, satın aldığınız bir ürün değildir. Kimlik, ağ, veri ve uygulama katmanları genelinde katman katman inşa ettiğiniz bir mimari duruştur. İşte gerçekte nasıl yapılacağı."
---

Sıfır güven, pek çok mühendislik liderinin duyduğunda haklı olarak şüpheyle yaklaştığı bir pazarlama terimine dönüşmüştür. Her güvenlik duvarı satıcısı, her IAM platformu, her uç nokta çözümü artık "sıfır güven" sunduğunu iddia ediyor. Hiçbiri bunu tek başına sunmuyor.

Sıfır güven bir ürün değil, mimari bir duruştur. Teknoloji yığınınızın tamamında pratiğe dökülen bir dizi ilkedir. Bu rehber, gerçek bir sıfır güven uygulamasının nasıl göründüğünü net biçimde ortaya koyuyor: katmanları, sıralamayı, başarısızlık biçimlerini ve işe yarayıp yaramadığını söyleyen ölçümleri ele alıyor.

---

## Temel İlkeler

Forrester'ın orijinal modeli (2010, John Kindervag), bugün de geçerliliğini koruyan üç temel ilke belirledi:

1. **Tüm ağlar düşmancadır.** Ağınızın içi güvenilir değildir. Dışarısı da güvenilir değildir. Ortak konum tesisleri, VPN'ler, bulut özel ağları — bunların hiçbiri örtük güven sağlamaz. Her bağlantı, doğrulanana kadar güvenilmezdir.

2. **Her zaman en az ayrıcalıklı erişim.** Her kullanıcı, hizmet ve cihaz, yalnızca mevcut görev için gereken erişime sahip olur — fazlasına değil. Erişim, ilişki başına değil, oturum başına verilir. Bir S3 kovasından okuma gereken hizmet hesabı, kovalar ön ekinin tamamına erişemez.

3. **İhlali varsay.** Sistemlerinizi saldırganların zaten içeride olduğunu varsayarak tasarlayın. Her şeyi segmentleyin. Her şeyi günlüğe kaydedin. Patlama yarıçapını minimize edin. Bir saldırgan bir segmenti ele geçirirse, hemen bir duvarla karşılaşmalıdır.

Bu ilkeler bariz görünür. Zor olan, bunları gerçek anlamda uygulamanın erişim modelinizi sıfırdan yeniden inşa etmeyi gerektirmesidir — ve bu, çoğu kuruluşun yıllardır ertelediği bir çalışmadır.

---

## Sıfır Güven Olgunluk Modeli

Uygulamanızı planlamadan önce nerede durduğunuzu belirleyin. CISA'nın Sıfır Güven Olgunluk Modeli (2023), en pratik çerçeveyi sunmaktadır. İşte özet bir görünüm:

| Sütun | Geleneksel | Başlangıç | Gelişmiş | Optimal |
|-------|-----------|-----------|---------|---------|
| **Kimlik** | Statik kimlik bilgileri, çevre tabanlı | MFA zorunlu, SSO kısmi | Risk tabanlı uyarlanabilir kimlik doğrulama, RBAC | Sürekli doğrulama, ABAC, parolasız |
| **Cihazlar** | Yönetilmeyenler izin verilir, durum denetimi yok | MDM kayıtlı, temel uyumluluk | Tam durum değerlendirmesi, anomali tespiti | Sürekli cihaz sağlığı, otomatik düzeltme |
| **Ağlar** | Düz ağlar, alt ağ bazlı güven | VLAN segmentasyonu, temel ACL'ler | Mikro segmentasyon, uygulama düzeyi kontroller | Dinamik politika, yazılım tanımlı çevre |
| **Uygulamalar** | Tüm uygulamalara VPN erişimi | Uygulama başına MFA, temel WAF | API ağ geçidi, OAuth 2.0, servis ağı | Sıfır güven uygulama erişimi, CASB, tam API kimlik doğrulama |
| **Veri** | Sınıflandırılmamış, beklemede şifrelenmemiş | Temel sınıflandırma, beklemede şifreleme | DLP, haklar yönetimi, veri etiketleme | Dinamik veri kontrolleri, otomatik sınıflandırma |
| **Görünürlük** | Reaktif, temel kurallarla SIEM | Merkezi günlükleme, uyarı odaklı | UEBA, davranışsal taban çizgileri | Gerçek zamanlı risk puanlaması, otomatik müdahale |

Kurumların büyük çoğunluğu, pek çok sütunda Geleneksel ile Başlangıç arasında yer almaktadır. Hedef, Optimal'e her yerde eş zamanlı ulaşmak değil; saldırganların istismar edebileceği boşluklar yaratmadan her sütunu ilerletecek tutarlı bir aşamalı plan oluşturmaktır.

---

## Katman 1: Kimlik — Yeni Çevre

Sıfır güven kimlikle başlar. Kimin (veya neyin) erişim istediğini kesin olarak bilmiyorsanız, başka hiçbir kontrolün önemi yoktur.

### Çok Faktörlü Kimlik Doğrulama

MFA, temel gereksinimdir. 2026'da tüm insan kimliklerinde yüzde 100 MFA kapsamına sahip değilseniz, bu yazıyı okumayı bırakın ve önce bunu düzeltin. Ölçekte önem taşıyan nüanslar:

- **Yalnızca kimlik avına dirençli MFA.** TOTP (kimlik doğrulayıcı uygulamalar) ve SMS, gerçek zamanlı kimlik avı proxy'leri (Evilginx, Modlishka) tarafından ele geçirilir. Ayrıcalıklı kullanıcılar ve üretim sistemlerine erişimi olan herhangi bir rol için FIDO2/WebAuthn'u (geçiş anahtarları, donanım güvenlik anahtarları) zorunlu kılın. Daha zorlu bir dağıtımdır, ancak güvenlik farkı muazzamdır.
- **Hizmet hesapları için MFA.** İnsan hesapları tek saldırı vektörü değildir. Kalıcı token'lara sahip hizmet hesapları, yüksek değerli hedeflerdir. Statik API anahtarları veya parola yerine iş yükü kimlik federasyonu (AWS IAM Roles Anywhere, GCP Workload Identity, Azure Managed Identity) aracılığıyla kısa ömürlü kimlik bilgileri zorunlu kılın.

### SSO ve Kimlik Federasyonu

Kimlik doğrulamayı merkezileştirmek, kimlik bilgisi yayılmasını ortadan kaldırır. Her SaaS aracı, her dahili uygulama, her bulut konsolu, IdP'niz (Okta, Microsoft Entra, Ping Identity) aracılığıyla kimlik doğrulamalıdır. Bu isteğe bağlı değildir — yerel kimlik bilgilerine sahip gölge BT, olay müdahalesinde tekrarlayan bir ilk erişim vektörüdür.

**Uygulama sırası:**
1. Tüm uygulamaları envantere alın (gölge BT'yi keşfetmek için bir CASB veya ağ proxy'si kullanın)
2. Veri hassasiyetine ve kullanıcı sayısına göre önceliklendirin
3. En yüksek riskli uygulamaları önce entegre edin (üretim erişimi, finansal sistemler, kaynak kontrolü)
4. IdP kimlik doğrulamasını zorunlu kılın; yerel kimlik bilgilerini devre dışı bırakın

### RBAC'tan ABAC'a: Evrim

Rol Tabanlı Erişim Kontrolü (RBAC) bir başlangıç noktasıdır, nihai nokta değil. Roller zamanla birikir — her proje yeni bir rol ekler, eskiler temizlenmez ve 18 ay içinde örtüşen izinlere sahip 400 rolünüz olur ve kimse modeli anlamaz.

Nitelik Tabanlı Erişim Kontrolü (ABAC) olgun hedeftir. Erişim kararları, öznenin (kullanıcı), nesnenin (kaynak) ve ortamın (zaman, konum, cihaz durumu) nitelikleri temel alınarak verilir:

```
PERMIT IF:
  subject.department = "Engineering" AND
  subject.clearance_level >= "L3" AND
  object.classification = "Internal" AND
  environment.device_managed = true AND
  environment.location NOT IN high_risk_countries
```

OPA (Open Policy Agent), bulut yerel ortamlarda ABAC için standart uygulama katmanıdır. Politikalar Rego ile yazılır, istek anında değerlendirilir ve merkezi olarak denetlenir.

---

## Katman 2: Ağ — Mikro Segmentasyon ve SDP

Sıfır güvende ağ katmanı, ağ konumunun sağladığı örtük güveni ortadan kaldırmakla ilgilidir. Kurumsal ağda olmak hiçbir erişim ayrıcalığı sağlamamalıdır.

### Mikro Segmentasyon

Geleneksel çevre güvenliği her şeyin etrafına tek bir duvar çizerdi. Mikro segmentasyon pek çok duvar çizer — her iş yükü, uygulama katmanı ve ortam arasında. Hedef: bir saldırgan bir web sunucusunu ele geçirirse, ayrı ve doğrulanmış bir bağlantı olmadan veritabanına ulaşamamalıdır.

**Olgunluğa göre uygulama yaklaşımları:**

- **Ana bilgisayar tabanlı güvenlik duvarı politikası** (en düşük çaba, kaldır-ve-taşı için yeterli): İşletim sistemi düzeyindeki güvenlik duvarlarını kullanarak her ana bilgisayarda katı çıkış kuralları uygulayın. Ölçekte sürdürmek için orkestrasyon araçları gerektirir (Chef, Ansible). Karma ortamlarda çalışır.

- **Kubernetes'te ağ politikası** (bulut yerel ortamlar): Kubernetes NetworkPolicy kaynakları, pod'dan pod'a iletişimi kontrol eder. Tüm giriş ve çıkışı varsayılan olarak reddedin, ardından gerekli yolları açıkça izin verin.

```yaml
# Default deny all ingress to the payments namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: payments
spec:
  podSelector: {}
  policyTypes:
    - Ingress
---
# Explicitly allow only the API gateway to reach payment-service
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-gateway
  namespace: payments
spec:
  podSelector:
    matchLabels:
      app: payment-service
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: api-gateway
          podSelector:
            matchLabels:
              app: gateway
      ports:
        - protocol: TCP
          port: 8080
  policyTypes:
    - Ingress
```

- **Cilium ile CNI katmanı politikası** (gelişmiş): Cilium, L7 farkındalığıyla (HTTP yöntemi, DNS, Kafka konusu) çekirdek düzeyinde ağ politikasını uygulamak için eBPF kullanır. Standart NetworkPolicy'den önemli ölçüde daha güçlüdür.

### Yazılım Tanımlı Çevre (SDP)

SDP, uzak erişim mimarisinde VPN'in yerini alır. Temel farklar:

| VPN | SDP |
|-----|-----|
| Ağ düzeyinde erişim | Uygulama düzeyinde erişim |
| Bağlantıda güven | Her istekte doğrulama |
| İç ağı açığa çıkarır | İç ağ açığa çıkmaz |
| Statik erişim kontrolü | Dinamik, politika odaklı |
| Durum doğrulaması yok | Her bağlantıda cihaz durumu kontrolü |

Cloudflare Access, Zscaler Private Access ve Palo Alto Prisma Access, önde gelen ticari uygulamalardır. Kendi kendine barındırmaya ihtiyaç duyan kuruluşlar için açık kaynak seçenekler (Netbird, Headscale) mevcuttur.

### Karşılıklı TLS (mTLS)

Ortamınızdaki doğu-batı trafiği (hizmetten hizmete iletişim) şifrelenmiş ve karşılıklı kimlik doğrulamalı olmalıdır. mTLS, her iki tarafın da geçerli sertifikalar sunmasını zorlar — güvenliği ihlal edilmiş bir hizmet başkasının kimliğine bürünemez.

Servis ağı (Istio, Linkerd), Kubernetes iş yükleri için mTLS'yi otomatize eder. Sertifika yaşam döngüsü ağ tarafından yönetilir; geliştiriciler TLS kodu yazmaz. Kubernetes dışı iş yükleri için SPIFFE/SPIRE, iş yükü kimliği ve otomatik sertifika sağlama sunar.

---

## Katman 3: Veri — Sınıflandırma, Şifreleme ve DLP

Ağ ve kimlik kontrolleri erişim yollarını korur. Veri kontrolleri ise bilgiye nasıl erişildiğinden bağımsız olarak bilginin kendisini korur.

### Veri Sınıflandırması

Etiketlemediğinizi koruyamazsınız. Kurumsal ortamlar için işlevsel bir veri sınıflandırma şeması:

- **Genel** — Kasıtlı olarak herkese açık. Kontrol gerekmez.
- **Dahili** — İş operasyonel verileri. Kimlik doğrulamalı çalışanlara erişim kısıtlıdır.
- **Gizli** — Müşteri verileri, finansal kayıtlar, personel verileri. Beklemede ve aktarım sırasında şifreleme zorunludur. Erişim günlüğe kaydedilir.
- **Kısıtlı** — Düzenlenmiş veri (KBV, SKB, PCI), fikri mülkiyet, M&A bilgileri. Katı erişim kontrolleri, DLP uygulaması, denetim izleri.

Ölçekte otomatik sınıflandırma araçlar gerektirir: Microsoft Purview, Google Cloud DLP veya açık kaynak alternatifler (KBV tespiti için Presidio). Bilinen depolarla (S3 kovaları, SharePoint, veritabanları) başlayın, sınıflandırın ve saklama ile erişim politikalarını uygulayın.

### Şifreleme Stratejisi

- **Beklemede:** Her yerde AES-256. İstisna yok. Gizli ve Kısıtlı veriler için müşteri tarafından yönetilen anahtar materyaliyle bulut tarafından yönetilen anahtarlar (AWS KMS, GCP Cloud KMS) kullanın. Otomatik anahtar döndürmeyi etkinleştirin.
- **Aktarım sırasında:** Minimum TLS 1.3. TLS 1.0/1.1'i kullanımdan kaldırın. HSTS'yi zorunlu kılın. Yüksek değerli mobil/API istemcileri için sertifika sabitleme kullanın.
- **Kullanım sırasında:** Bulut sağlayıcısının düz metin verilere erişiminin bir uyumluluk sorunu olduğu bulut ortamlarındaki düzenlenmiş iş yükleri için gizli bilgi işlem (AMD SEV, Intel TDX).

### Veri Kaybını Önleme (DLP)

DLP, verinin yetkisiz kanallardan çıkmasını durduran uygulama katmanıdır. Odak alanları:

1. Web proxy/CASB üzerinde **çıkış DLP'si** — hassas içeriğin onaylanmamış hedeflere yüklenmesini tespit etme ve engelleme
2. **E-posta DLP'si** — sınıflandırılmış veri içeren giden e-postaları tespit etme ve karantinaya alma
3. **Uç nokta DLP'si** — çıkarılabilir ortama, kişisel bulut depolama alanına, PDF'e yazdırma ve e-postaya kopyalamayı engelleme

Yanlış pozitif oranı, operasyonel zorluktur. Çok agresif engelleyen bir DLP politikası üretkenliği mahveder ve analist güvenini yitirir. Tespit ve uyarı modunda başlayın, politikaları 60 gün boyunca ayarlayın, ardından yüksek güvenli kurallar için tespit ve engelleme moduna geçin.

---

## Katman 4: Uygulama — API Güvenliği ve Servis Ağı

### API Güvenliği

API'ler, modern uygulamaların saldırı yüzeyidir. Dış istekleri kabul eden her API şunları gerektirir:

- **Kimlik doğrulama** (OAuth 2.0 / OIDC, API anahtarları değil)
- **Yetkilendirme** (kapsamlar, talep tabanlı erişim kontrolü)
- **Hız sınırlama** (istemci başına, yalnızca küresel değil)
- **Girdi doğrulama** (şema uygulaması, yalnızca temizleme değil)
- **Denetim günlükleme** (kim neyi, hangi parametrelerle, ne zaman çağırdı)

Bir API ağ geçidi (Kong, AWS API Gateway, Apigee), uygulama noktasıdır. Tüm dış trafik ağ geçidinden geçer; arka uç hizmetlere doğrudan ulaşılamaz. Ağ geçidi, kimlik doğrulama, hız sınırlama ve günlüklemeyi merkezi olarak yönetir, böylece bireysel hizmet ekipleri bunları tutarsız biçimde uygulamaz.

### Dahili API'ler için Servis Ağı

Dahili hizmetten hizmete iletişim için bir servis ağı, uygulama koduna yük bindirmeden aynı kontrolleri sunar:

- mTLS (otomatik, geliştirici yapılandırması gerekmez)
- Yetkilendirme politikaları (A hizmeti, B hizmetinde X uç noktasını çağırabilir; C hizmeti çağıramaz)
- Dağıtılmış izleme (hata ayıklama ve denetim için zorunludur)
- Trafik yönetimi (devre kesiciler, yeniden denemeler, zaman aşımları)

---

## Aşamalı Dağıtım Stratejisi

Sıfır güveni tüm sütunlarda eş zamanlı uygulamaya çalışmak, başarısız projelerin ve kurumsal direncin tarifesidir. Gerçekçi bir kurumsal dağıtım 18-36 ay sürer:

**Aşama 1 (1-6. Aylar): Kimlik sertleştirme**
- Kimlik avına dirençli yöntemlerle yüzde 100 MFA kapsamı
- Tüm 1. Kademe uygulamalar için SSO
- Yönetici hesapları için Ayrıcalıklı Erişim Yönetimi (PAM)
- Hizmet hesabı envanteri ve kimlik bilgisi döndürme

**Aşama 2 (6-12. Aylar): Görünürlük ve taban çizgisi**
- Normalleştirilmiş şema ile merkezi günlükleme (SIEM)
- UEBA davranışsal taban çizgileri (minimum 30 gün)
- Cihaz envanteri ve MDM uygulaması
- En hassas depolar için veri sınıflandırması

**Aşama 3 (12-24. Aylar): Ağ kontrolleri**
- Üretim ortamları için mikro segmentasyon
- SDP dağıtımı (VPN'i değiştir veya destekle)
- Hizmetten hizmete iletişim için mTLS
- Cihaz durumuna dayalı ağ erişim kontrolü

**Aşama 4 (24-36. Aylar): Gelişmiş ve sürekli**
- Eski RBAC'ın yerini alan ABAC politika modeli
- Tüm çıkış kanallarında DLP
- Sürekli doğrulama ve otomatik müdahale
- Olgunluk modeli yeniden değerlendirmesi ve boşluk kapatma

---

## Yaygın Tuzaklar

Sıfır güven programlarında başarısız olan kuruluşlar tahmin edilebilir hatalar yapar:

**Pazarlamayı satın almak, mimariyi atlamak.** Bir ürüne sıfır güven etiketi yapıştırmak, sıfır güvenin uygulandığı anlamına gelmez. Kimlik, ağ, veri ve uygulama genelinde tutarlı bir mimariye ihtiyaç duyarsınız. Hiçbir tek satıcı bunu sağlamaz.

**Kimlik yerine ağ kontrollerinden başlamak.** İçgüdü, somut ve tanıdık olduğu için güvenlik duvarıyla başlamaktır. Kimlik önceliği mantığa aykırı görünür, ancak doğrudur — kimlik kontrolleri olmadan ağ segmentasyonu yalnızca daha karmaşık bir çevre oluşturur.

**Hizmet hesaplarını ve makine kimliklerini ihmal etmek.** İnsan kimlik programları iyi anlaşılmıştır. Makine kimlik programları değildir. İnsan dışı kimlikler (hizmet hesapları, CI/CD token'ları, bulut rolleri) genellikle insan kimliklerini 10:1 oranında geçer ve çok daha az yönetişim dikkatine maruz kalır.

**Geri bildirim döngüsünü atlamak.** Sıfır güven, politikaların çalıştığını ve erişim izninin uygun olmaya devam ettiğini doğrulamak için sürekli izleme gerektirir. Otomatik erişim gözden geçirme ve anomali tespiti olmadan, politikalar bayatlar ve örtük güvene geri döner.

> Sıfır güven bir varış noktası değildir. Bir işletme modelidir. Olgunluk modeli, "bitti" diye bir şeyin olmadığını gösterir — yalnızca "daha da ileri" vardır. Sıfır güven programlarını sürdüren kuruluşlar, güvenlik duruşunu sürekli ölçülen bir mühendislik metriği olarak ele alır, bir uyumluluk onay kutusu olarak değil.

Doğru yapıldığında getiri ölçülebilirdir: ihlallerde azalan patlama yarıçapı, yanal hareketi daha hızlı tespit etme ve en talep eden düzenleyici çerçeveleri bile karşılayan denetim izleri. Çalışma önemlidir. Alternatif — hiç bu kadar düşmanca olmayan bir tehdit ortamında örtük güven — sürdürülebilir değildir.
