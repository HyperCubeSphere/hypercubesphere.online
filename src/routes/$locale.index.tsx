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
      <section className="px-6 md:px-12 py-16 md:py-24 border-b-3 border-border-light dark:border-border-dark">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 items-center">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">{h.eyebrow}</p>
            <h1 className="text-4xl md:text-[54px] font-extrabold leading-[1.05] tracking-tight mb-6 text-balance">
              {h.headingPre}<span className="accent-highlight">{h.headingBold}</span>{h.headingPost}
            </h1>
            <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-lg leading-relaxed mb-8">{h.subtitle}</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/$locale/contact" params={{ locale }} className="bg-accent text-white border-3 border-accent px-8 py-4 font-mono text-[13px] font-extrabold uppercase tracking-widest glow-accent transition-[background-color,color] duration-200 hover:bg-transparent hover:text-accent touch-manipulation">{h.cta}</Link>
              <Link to="/$locale/services" params={{ locale }} className="border-3 border-border-light dark:border-border-dark px-8 py-4 font-mono text-[13px] font-bold uppercase tracking-widest transition-[border-color,color] duration-200 hover:border-accent hover:text-accent touch-manipulation">{h.ctaSecondary}</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {h.stats.map((s, i) => (
              <StatBlock key={i} value={s.value} label={s.label} variant={(['accent', 'dark', 'teal', 'default'] as const)[i]} />
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-wrap justify-between items-center px-6 md:px-12 py-6 border-b-3 border-border-light dark:border-border-dark gap-4">
        {h.trustBar.map((item) => (
          <span key={item} className="font-mono text-[11px] uppercase tracking-[3px] text-muted-light dark:text-muted-dark font-semibold">
            <span className="text-accent mr-2">■</span>{item}
          </span>
        ))}
      </section>

      <section className="px-6 md:px-12 py-16">
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
      </section>

      <section className="px-6 md:px-12 py-16 border-t-3 border-border-light dark:border-border-dark">
        <div className="mb-8">
          <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-2">{h.industriesEyebrow}</p>
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider">{h.industriesTitle}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0">
          {h.industries.map((ind) => (
            <div key={ind.prefix} className="border-3 border-border-light dark:border-border-dark p-6 -m-[1.5px] text-center brutalist-hover">
              <p className="font-mono text-xs text-accent font-bold mb-2">// {ind.prefix}</p>
              <p className="font-bold text-sm uppercase tracking-wider">{ind.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-12 py-20 border-t-3 border-accent text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">{h.ctaEyebrow}</p>
        <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-wider mb-6 max-w-2xl mx-auto text-balance">
          {h.ctaHeadingPre}<span className="accent-highlight">{h.ctaHeadingBold}</span>
        </h2>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-lg mx-auto mb-8 leading-relaxed">{h.ctaSubtitle}</p>
        <Link to="/$locale/contact" params={{ locale }} className="inline-block bg-accent text-white border-3 border-accent px-10 py-4 font-mono text-sm font-extrabold uppercase tracking-widest glow-accent transition-[background-color,color] duration-200 hover:bg-transparent hover:text-accent touch-manipulation">{h.ctaButton}</Link>
      </section>
    </div>
  )
}
