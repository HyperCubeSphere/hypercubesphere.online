import { createFileRoute, Link } from '@tanstack/react-router'
import SectionHeader from '../components/SectionHeader'
import { useI18n } from '../i18n'
import { seo } from '../lib/seo'
import { getTranslation } from '../i18n/translations'

export const Route = createFileRoute('/$locale/services')({
  component: ServicesPage,
  head: ({ params }) => { const t = getTranslation(params.locale); return {
    ...seo({
      title: t.services.seoTitle,
      description: t.services.seoDescription,
      path: '/services',
      locale: params.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ProfessionalService',
        name: 'HyperCubeSphere',
        url: 'https://hypercubesphere.online',
        description: 'Security-first, engineer-led technology consulting agency offering AI, cybersecurity, cloud, data, and strategic advisory services.',
        areaServed: 'Worldwide',
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Technology Consulting Services',
          itemListElement: t.services.items.map((s: any, i: number) => ({
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: s.title,
              description: s.description,
            },
            position: i + 1,
          })),
        },
      },
    }),
  }},
})

function ServicesPage() {
  const { locale, t } = useI18n()
  const s = t.services

  return (
    <div>
      <section className="px-6 md:px-12 py-16 md:py-24 border-b-3 border-border-light dark:border-border-dark">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">{s.eyebrow}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-6 max-w-2xl text-balance">
          {s.headingPre}<span className="accent-highlight">{s.headingBold}</span>
        </h1>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-xl leading-relaxed">{s.subtitle}</p>
      </section>

      <section className="px-6 md:px-12 py-16">
        <SectionHeader eyebrow={s.listEyebrow} title={s.listTitle} count={s.listCount} />
        <div className="space-y-0">
          {s.items.map((service) => (
            <div key={service.number} className="border-3 border-border-light dark:border-border-dark p-8 md:p-10 -mt-[3px] first:mt-0 group transition-[border-color,background-color] duration-200 relative z-0 hover:z-10 hover:border-accent hover:bg-hover-light dark:hover:bg-hover-dark">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8">
                <div>
                  <p className="font-mono text-xs font-bold text-accent mb-3 tracking-wider">// {service.number}</p>
                  <h3 className="text-xl font-extrabold uppercase tracking-wider mb-4">{service.title}</h3>
                  <p className="font-mono text-[13px] text-muted-light dark:text-muted-dark leading-relaxed">{service.description}</p>
                </div>
                <div>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent mb-4">{s.capabilitiesLabel}</p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {service.capabilities.map((cap) => (
                      <li key={cap} className="font-mono text-[13px] text-muted-light dark:text-muted-dark flex items-start gap-2">
                        <span className="text-accent mt-0.5">■</span>{cap}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-12 py-16 border-t-3 border-border-light dark:border-border-dark">
        <SectionHeader eyebrow={s.whyEyebrow} title={s.whyTitle} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0">
          {s.differentiators.map((d, i) => (
            <div key={d.label} className="border-3 border-border-light dark:border-border-dark p-6 -m-[1.5px] brutalist-hover">
              <p className="font-mono text-xs font-bold text-accent mb-3 tracking-wider">// 0{i + 1}</p>
              <h3 className="text-base font-bold uppercase tracking-wider mb-2">{d.label}</h3>
              <p className="font-mono text-[13px] text-muted-light dark:text-muted-dark leading-relaxed">{d.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-12 py-16 border-t-3 border-accent text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider mb-6">{s.ctaTitle}</h2>
        <Link to="/$locale/contact" params={{ locale }} className="inline-block bg-accent text-white border-3 border-accent px-10 py-4 font-mono text-sm font-extrabold uppercase tracking-widest glow-accent transition-[background-color,color] duration-200 hover:bg-transparent hover:text-accent touch-manipulation">{s.ctaButton}</Link>
      </section>
    </div>
  )
}
