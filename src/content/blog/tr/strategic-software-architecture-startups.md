---
title: "Girişimler İçin Stratejik Yazılım Mimarisi: Aşırı Mühendislik Yapmadan Ölçeklenmek"
description: "İşletmenizle ölçeklenen mimari kararlar. Modüler yekpare yapılar, mikro hizmet çıkarımı, veritabanı stratejisi ve ekip topolojisi hizalamasını kapsayan aşama bazlı bir çerçeve."
date: "2025-11-14"
author: "HyperCubeSphere Engineering"
tags: ["mimari", "girişimler", "mühendislik", "ölçeklenebilirlik", "arka uç"]
---

Girişimlerdeki mimari felaketlerin büyük çoğunluğu, mühendislerin yetersiz olmasından kaynaklanmaz. Ekibin yanlış aşama için doğru kararı vermesinden kaynaklanır. 200 mühendislik organizasyonu için son derece mantıklı olan mikro hizmet odaklı bir mimari, 12 kişilik bir şirketi öldüren bir organizasyonel vergi haline gelir. Seed aşamasında sizi iyi koruyan bir yekpare yapı, Seri B'de neden özellik geliştiremediğinizin nedeni haline gelir.

Bu, gelir öncesi ürün ekiplerinden günde milyarlarca olay işleyen şirketlere kadar 60'tan fazla mühendislik organizasyonuyla çalışmanın getirdiği aşama bazlı bir çerçevedir. Hedef, evrensel bir mimari sunmak değildir. Hedef, mevcut kısıtlamalarınızla ve bir sonraki ufkunuzla hizalı kalan mimari kararlar almanız için bir çerçeve sunmaktır.

## Temel İlke: Mimari Organizasyona Hizmet Eder

Teknik ayrıntıdan önce, izleyen her şeyi bilgilendirecek temel bir açıklama:

> **Mimariniz bir teknik eser değildir. Mühendislik ekibiniz, ürün hızınız ve operasyonel kapasiteniz arasındaki sosyal bir sözleşmedir. Buna göre optimize edin.**

Conway Yasası bir öneri değildir. Sisteminiz, ister planlayın ister planlamayın, organizasyonunuzun iletişim yapısını yansıtacaktır. Tek soru, bunu kasıtlı yapıp yapmadığınızdır.

## Aşama 1: Seed — Modüler Yekpare Yapı

Seed aşamasında birincil kısıtlamalarınız şunlardır:
- **Ekip büyüklüğü**: Genellikle genelci olan 2-8 mühendis
- **Birincil risk**: Ürün-pazar uyumunu yeterince hızlı bulamamak
- **İkincil risk**: Tamamen atmak zorunda kalacağınız bir şey inşa etmek

Bu aşamayı en iyi atlatacak mimari, **modüler yekpare yapıdır** — güçlü dahili modül sınırlarına sahip tek bir dağıtılabilir birim.

### Modüler Yekpare Yapı Gerçekte Nasıl Görünür

Yaygın hata, "yekpare yapı"yı "büyük çamur topu" ile eş anlamlı saymaktır. İyi yapılandırılmış bir modüler yekpare yapı, operasyonel yük olmaksızın mikro hizmetlerle aynı mantıksal ayrıma sahiptir.

```
src/
├── modules/
│   ├── billing/
│   │   ├── billing.service.ts
│   │   ├── billing.repository.ts
│   │   ├── billing.types.ts
│   │   └── billing.routes.ts
│   ├── users/
│   │   ├── users.service.ts
│   │   ├── users.repository.ts
│   │   ├── users.types.ts
│   │   └── users.routes.ts
│   ├── notifications/
│   │   ├── notifications.service.ts
│   │   ├── notifications.repository.ts
│   │   └── notifications.types.ts
│   └── analytics/
│       ├── analytics.service.ts
│       ├── analytics.repository.ts
│       └── analytics.types.ts
├── shared/
│   ├── database/
│   ├── middleware/
│   ├── errors/
│   └── config/
└── app.ts
```

Temel disiplin: **modüller yalnızca genel hizmet arayüzleri aracılığıyla iletişim kurar, başka bir modülün tablolarına hiçbir zaman doğrudan veritabanı erişimi olmaz.** `notifications` modülünüzün kullanıcı verilerine ihtiyacı varsa `users.service.getUser()` çağırır — `users` tablosunu doğrudan JOIN yapmaz.

Bu disiplin, ileride bir modülü tam yeniden yazma olmaksızın bağımsız bir hizmet olarak çıkarabilmenizi sağlar.

### Seed Aşamasında Veritabanı Stratejisi

Tek bir PostgreSQL örneği çalıştırın. Bu aşamada kimsenin sizi modül başına ayrı veritabanlarına ikna etmesine izin vermeyin. Operasyonel yük ve modüller arası sorgu karmaşıklığı buna değmez.

İlk günden itibaren yapmanız gerekenler:
- PostgreSQL şemalarını kullanarak **mantıksal şema ayrımı** (yalnızca düz tablo ad alanı değil). `users` modülü `users` şemasına sahiptir. `billing`, `billing` şemasına sahiptir.
- **Yabancı anahtar disiplinini zorunlu kılın** — bu, ucuza mal olan şu an, veri sahipliğini düşünmeye zorlar.
- **Okuma replikalarını** ihtiyaç duyduğunuzu düşünmeden önce kurun — aylık 30 dolar tutar ve analitik sorgularınız yazma gecikmesini öldürmeye başladığında sizi kurtaracaktır.

### Uzun Ömürlülük İçin API Tasarımı

Seed aşamasındaki harici API kararlarınız sizi yıllarca kısıtlayacaktır. Birkaç zorunlu desen:

**Yalnızca v1'iniz olsa bile ilk günden sürüm belirleyin.**

```
/api/v1/users
/api/v1/billing/subscriptions
```

Hiçbir zaman `/api/users` kullanmayın. `/v2/` eklemek sonradan çok büyük bir maliyete yol açar. Başlangıçtan itibaren dahil etmenin maliyeti sıfırdır.

**Veri modeliniz için değil, tüketicileriniz için tasarlayın.** En yaygın hata, veritabanı şemanızı yansıtan bir API oluşturmaktır. `/users` uç noktanız dahili `user_account` tablo yapınızı açığa çıkarmamalıdır. Tüketicilerinizin gerçekte neye ihtiyaç duyduğunu açığa çıkarmalıdır.

**Kaynak odaklı tasarımı tutarlı biçimde kullanın.** REST veya GraphQL seçin ve bağlı kalın. Seed aşamasındaki hibrit yaklaşımlar, ölçekte katlanarak artan karmaşıklık yaratır.

## Aşama 2: Seri A — Baskı Altındaki Modüler Yekpare Yapı

Seri A'da ekibiniz büyümüştür (genellikle 15-40 mühendis) ve yekpare yapınız zorlanmaya başlamıştır. Belirtileri tanıyacaksınız:
- Derleme süreleri 5-8 dakikayı aşıyor
- Her şey birlikte dağıtıldığından dağıtımlar riskli hissettiriyor
- İki ekip birbirinin veritabanı geçişlerini sürekli eziyor
- Tek bir yavaş sorgu, uygulamanın tamamında yanıt sürelerini etkiliyor

Bu, "mikro hizmetlere geçiş" zamanı değildir. Bu, **modüler yekpare yapıyı güçlendirme** ve çıkarım konusunda cerrahi davranma zamanıdır.

### Özellik Bayrakları: Her Şeyin Ön Koşulu

Mikro hizmet çıkarımından söz etmeden önce, veritabanı parçalamadan söz etmeden önce, olgun özellik bayraklarına ihtiyacınız var. Bunlar, ölçekte güvenli, sürekli dağıtımın temelidir.

```typescript
// A minimal, production-ready feature flag implementation
interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage?: number;
  allowlist?: string[];
  metadata?: Record<string, unknown>;
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlagConfig>;

  isEnabled(flagKey: string, context: { userId: string; orgId?: string }): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag || !flag.enabled) return false;

    // Allowlist check takes priority
    if (flag.allowlist?.includes(context.userId)) return true;
    if (flag.allowlist?.includes(context.orgId ?? '')) return true;

    // Percentage rollout via consistent hashing
    if (flag.rolloutPercentage !== undefined) {
      const hash = this.hashUserId(context.userId);
      return (hash % 100) < flag.rolloutPercentage;
    }

    return true;
  }

  private hashUserId(userId: string): number {
    // FNV-1a hash for consistent distribution
    let hash = 2166136261;
    for (let i = 0; i < userId.length; i++) {
      hash ^= userId.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    return hash;
  }
}
```

Özellik bayrakları şunları yapmanızı sağlar:
- Özellikleri yayınlamadan kod dağıtmak
- Altyapı değişikliklerinde (yalnızca UX değil) A/B testi yapmak
- Bir bayrak arkasında hizmetleri çıkarmak ve trafiği aşamalı olarak yönlendirmek
- Üretimdeki tehlikeli özellikler için devre kesiciler

Bunlar, ekibinizi ölçeklendirmeden önce platform altyapınıza yerleştirebileceğiniz en yüksek kaldıraçlı tek özelliktir.

### Mikro Hizmet Ne Zaman Çıkarılır

Bir modülün çıkarılmaya hazır olduğuna dair sinyaller:

1. **Bağımsız ölçeklendirme gereksinimleri** — `video-processing` modülünüz 32 çekirdekli makinelere ihtiyaç duyuyor. `user-auth` modülünüz 2 çekirdekte sorunsuz çalışıyor. Bunları birlikte çalıştırmak, her şey için en pahalı seçeneği sağlamanızı zorlar.
2. **Bağımsız dağıtım ritmi** — Modülün sahibi ekip günde 15 kez dağıtırken yekpare yapının geri kalanı haftada iki kez dağıtıyor. Bağlaşım sürükleme yaratıyor.
3. **Farklı operasyonel profil** — Modülün temel olarak farklı SLA gereksinimleri (yüzde 99,99'a karşı yüzde 99,9), dil gereksinimleri veya uyumluluk izolasyonu ihtiyaçları vardır.
4. **Ekip uçtan uca sahibidir** — Etki alanına sahip net ve istikrarlı bir ekip var. Ekip sınırları olmayan hizmet sınırları, dağıtılmış yekpare yapı cehennemine yol açar.

Çıkarım için YANLIŞ sinyaller:
- "Mikro hizmetler modern"
- Modül büyük (boyut kriter değildir — bağlaşım kriterdir)
- Yeni bir mühendis Go denemek istiyor

### Rekabet Avantajı Olarak CI/CD

Seri A'da dağıtım hattınız DevOps bakımı değil — stratejik bir varlıktır. Günde 50 kez dağıtabilen şirketler, haftalık dağıtım yapan şirketlerden daha hızlı hareket eder, nokta.

Hedef hat aşamaları ve zaman bütçeleri:

| Aşama | Hedef Süre | Yaptığı |
|---|---|---|
| Lint + Tür Kontrolü | < 60s | Sözdizimi, tür hatalarını yakalar |
| Birim Testleri | < 3 dk | Mantık üzerinde hızlı geri bildirim |
| Entegrasyon Testleri | < 8 dk | Veritabanı, API sözleşme testleri |
| Derleme + Paket | < 4 dk | Üretim artefaktı oluşturma |
| Hazırlık Dağıtımı | < 5 dk | Otomatik duman testleri |
| Üretim Dağıtımı | < 3 dk | Mavi/yeşil veya kanarya |

Toplam: **commit'ten üretime 25 dakikanın altında**. Bunun üzerindeki her dakika, tüm organizasyonunuz genelinde hız sürüklenmesine birikerek dönüşen bir sürtünmedir.

## Aşama 3: Seri B ve Ötesi — Kasıtlı Ayrışma

Seri B+'da muhtemelen 60'tan fazla mühendis, birden fazla ürün hattı ve gerçek bir organizasyonel yapınız var. Mimari soru "bunu nasıl inşa ederiz"den "8 ekibin bağımsız biçimde nasıl sevkiyat yapmasını sağlarız"a kayar.

### Ekip Topolojisi Hizalaması

Bu aşamadaki en önemli mimari karar teknolojiye hiç ilişkin değildir. Ekip yapınızla eşleşen hizmet sınırları çizmekle ilgilidir.

**Ekip Topolojileri** çerçevesini rehberiniz olarak kullanın:
- **Akış hizalı ekipler**, ürünün uçtan uca dilimlerine sahiptir. Minimal dış bağımlılıklarla eksiksiz hizmetlere veya hizmet gruplarına sahip olmalıdırlar.
- **Platform ekipler**, akış hizalı ekiplerin self servis olarak tükettiği dahili özellikleri (gözlemlenebilirlik, dağıtım, veri altyapısı) oluşturur.
- **Etkinleştirici ekipler** geçicidir — akış hizalı ekipleri yetkinleştirir ve ardından dağılır.

Bu aşamadaki yaygın başarısızlık biçimi: ekip sınırlarıyla eşleşmeyen mikro hizmetleri çıkarmak; bu, tek bir özelliği değiştirmek için sürekli ekipler arası koordinasyon gerektiren bir mimari yaratır.

### İlk Günden Gözlemlenebilirlik (Vazgeçilmez)

Bu yazıdan tek bir şey alacaksanız, bu olsun: **sisteminizi veriye ihtiyaç duymadan önce enstrümante edin, bir şey bozulduktan sonra değil.**

Gözlemlenebilirlik yığınınız şunları içermelidir:
- Tutarlı alanlarla **yapılandırılmış günlükleme** (`service`, `trace_id`, `user_id`, `duration_ms`)
- **Dağıtılmış izleme** (OpenTelemetry standarttır — özel mülkiyete bahis yapmayın)
- Hizmet başına **RED metrikleri**: Hız, Hatalar, Süre
- Yalnızca mühendisler için değil, paydaşlar için önem taşıyan **iş metrikleri**

```typescript
// Structured logging — do this from day one
const logger = createLogger({
  level: 'info',
  format: {
    service: process.env.SERVICE_NAME,
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  },
});

// Every request handler should emit structured context
app.use((req, res, next) => {
  req.log = logger.child({
    trace_id: req.headers['x-trace-id'] ?? generateTraceId(),
    user_id: req.user?.id,
    request_id: generateRequestId(),
  });
  next();
});
```

Bunu dağıtılmış bir sisteme sonradan eklemenin maliyeti muazzamdır. Başlangıçtan itibaren dahil etmenin maliyeti iki günlük platform çalışmasıdır.

## Yatırım Olarak Teknik Borç, Başarısızlık Olarak Değil

Mühendislik liderliğinin teknik borç hakkında düşünme biçimini değiştiren bir yeniden çerçeveleme:

**Teknik borç bir disiplin başarısızlığı değildir. Bir finansman kararıdır.**

Seed aşamasında daha hızlı teslimat için test kapsamını atlayarak teknik borç aldığınızda, rasyonel bir tercih yaptınız: mevcut hız için gelecekteki mühendislik zamanına karşı borçlandınız. Finansal borç gibi, soru onu alıp almamak değil — koşulların uygun olup olmadığı ve onu servis etmek için bir planınızın olup olmadığıdır.

**Belgelenmiş, sınırlandırılmış ve planlanmış** borç kabul edilebilirdir. **Gizlenmiş, sınırsız ve büyüyen** borç ise varoluşsal bir tehdittir.

Pratik uygulamalar:
- **Açık bir teknik borç kaydı tutun** — tahmini taşıma maliyeti ve geri ödeme maliyetiyle birlikte bilinen borç öğelerinin izlenen listesi
- Sprint kapasitesinin **yüzde 20'sini** borç servisi için pazarlık konusu olmayan bir bütçe kalemi olarak ayırın
- **Kritik yollara hiçbir zaman borç eklemeyin** — kimlik doğrulama, faturalama ve güvenlik daha yüksek standartlarda tutulmalıdır
- **Borcu olaylarla ilişkilendirin** — bilinen bir borç kalemi bir üretim olayına neden olduysa önceliği anında yükselir

Tüm üç aşamayı başarıyla geçiren mühendislik liderleri bir özelliği paylaşır: mimariyi bir kerelik tasarım egzersizi değil, yaşayan, bağlamsal bir karar olarak ele alırlar. Yeniden ziyaret ederler, yeniden düzenlerler ve — gerektiğinde — yeniden inşa ederler. Başarısız olan şirketler, seed aşamasında bir karar verip Seri B boyunca onu dini biçimde savunanlardır.

Mimari haklı olmakla ilgili değildir. Şu an için haklı olmak ve ilerisi için seçeneklerinizi açık tutmakla ilgilidir.
