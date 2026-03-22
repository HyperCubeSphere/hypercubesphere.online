import { createFileRoute, Link } from '@tanstack/react-router'
import ServiceCard from '../components/ServiceCard'
import StatBlock from '../components/StatBlock'
import { useI18n } from '../i18n'
import { seo } from '../lib/seo'
import { getTranslation } from '../i18n/translations'

export const Route = createFileRoute('/$locale/')({
  component: HomePage,
  head: ({ params }) => {
    const t = getTranslation(params.locale)
    return {
    ...seo({
      title: t.home.seoTitle,
      description: t.home.seoDescription,
      path: '/',
      locale: params.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'HyperCubeSphere',
        url: 'https://hypercubesphere.online',
        description: 'Security-first, engineer-led technology consulting agency offering AI, cybersecurity, cloud, data, and strategic advisory services to enterprises.',
        foundingDate: '2021',
        numberOfEmployees: { '@type': 'QuantitativeValue', value: 6 },
        areaServed: 'Worldwide',
        knowsAbout: ['Artificial Intelligence', 'Cybersecurity', 'Cloud Architecture', 'Software Strategy', 'Data Engineering', 'Digital Transformation'],
        sameAs: ['https://github.com/HyperCubeSphere', 'https://linkedin.com', 'https://x.com'],
        contactPoint: { '@type': 'ContactPoint', email: 'info@hypercubesphere.online', contactType: 'customer service' },
      },
    }),
  }},
})

function HomePage() {
  const { locale, t } = useI18n()
  const h = t.home

  return (
    <div>
      <section className="py-20 md:py-32">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 enter-stagger">
          <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">{h.eyebrow}</p>
          <h1 className="text-4xl md:text-[64px] lg:text-[76px] font-extrabold leading-[1.02] tracking-tight mb-6 text-balance max-w-4xl">
            {h.headingPre}<span className="accent-highlight">{h.headingBold}</span>{h.headingPost}
          </h1>
          <p className="text-sm md:text-base text-muted-light dark:text-muted-dark max-w-xl leading-relaxed mb-10">{h.subtitle}</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/$locale/contact" params={{ locale }} className="bg-accent text-white border-3 border-accent px-8 py-4 font-mono text-[13px] font-extrabold uppercase tracking-widest glow-accent transition-[background-color,color] duration-200 hover:bg-transparent hover:text-accent touch-manipulation">{h.cta}</Link>
            <Link to="/$locale/services" params={{ locale }} className="border-3 border-border-light dark:border-border-dark px-8 py-4 font-mono text-[13px] font-bold uppercase tracking-widest transition-[border-color,color] duration-200 hover:border-accent hover:text-accent touch-manipulation">{h.ctaSecondary}</Link>
          </div>
        </div>
      </section>

      <section className="border-t-3 border-b-3 border-border-light dark:border-border-dark">
        <div className="max-w-[1400px] mx-auto grid grid-cols-2 lg:grid-cols-4">
          {h.stats.map((s, i) => (
            <StatBlock key={i} value={s.value} label={s.label} />
          ))}
        </div>
      </section>

      <section className="border-b-3 border-border-light dark:border-border-dark">
        <div className="max-w-[1400px] mx-auto flex flex-wrap justify-between items-center px-6 md:px-12 py-6 gap-4">
          {h.trustBar.map((item) => (
            <span key={item} className="font-mono text-[10px] md:text-[11px] uppercase tracking-widest md:tracking-[3px] text-muted-light dark:text-muted-dark font-semibold">
              <span className="text-accent mr-1.5 md:mr-2">■</span>{item}
            </span>
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b-3 border-border-light dark:border-border-dark pb-4">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-2">{h.servicesEyebrow}</p>
              <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider">{h.servicesTitle}</h2>
            </div>
            <span className="font-mono text-sm text-accent mt-2 md:mt-0">{h.servicesCount}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {h.services.map((s) => (
              <ServiceCard key={s.number} {...s} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/$locale/services" params={{ locale }} className="font-mono text-sm font-bold uppercase tracking-widest text-accent hover:underline">{h.viewAllServices}</Link>
          </div>
        </div>
      </section>

      <section className="border-t-3 border-border-light dark:border-border-dark">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent shrink-0">{h.industriesEyebrow}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {h.industries.map((ind) => (
                <span key={ind.prefix} className="text-sm font-bold uppercase tracking-wider">
                  <span className="font-mono text-accent text-xs mr-1.5">{ind.prefix}</span>{ind.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t-3 border-accent">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-24 md:py-32">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight mb-8 max-w-3xl text-balance">
            {h.ctaHeadingPre}<span className="accent-highlight">{h.ctaHeadingBold}</span>
          </h2>
          <Link to="/$locale/contact" params={{ locale }} className="inline-block bg-accent text-white border-3 border-accent px-10 py-4 font-mono text-sm font-extrabold uppercase tracking-widest glow-accent transition-[background-color,color] duration-200 hover:bg-transparent hover:text-accent touch-manipulation">{h.ctaButton}</Link>
        </div>
      </section>
    </div>
  )
}
