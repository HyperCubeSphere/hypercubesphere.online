import { createFileRoute } from '@tanstack/react-router'
import StatBlock from '../components/StatBlock'
import { useI18n } from '../i18n'
import { seo } from '../lib/seo'
import { getTranslation } from '../i18n/translations'

export const Route = createFileRoute('/$locale/about')({
  component: AboutPage,
  head: ({ params }) => { const t = getTranslation(params.locale); return {
    ...seo({ title: t.about.seoTitle, description: t.about.seoDescription, path: '/about', locale: params.locale }),
  }},
})

function AboutPage() {
  const { t } = useI18n()
  const a = t.about

  return (
    <div>
      <section className="px-6 md:px-12 py-16 md:py-24 border-b-3 border-border-light dark:border-border-dark">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">{a.eyebrow}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-6 max-w-2xl text-balance">
          {a.headingPre}<span className="accent-highlight">{a.headingBold}</span>{a.headingPost}
        </h1>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-xl leading-relaxed">{a.subtitle}</p>
      </section>

      <section className="px-6 md:px-12 py-16 border-b-3 border-border-light dark:border-border-dark">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">{a.storyEyebrow}</p>
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider mb-6">{a.storyTitle}</h2>
            <div className="space-y-4 font-mono text-[13px] text-muted-light dark:text-muted-dark leading-relaxed">
              {a.storyParagraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">{a.visionEyebrow}</p>
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider mb-6">{a.visionTitle}</h2>
            <div className="space-y-4 font-mono text-[13px] text-muted-light dark:text-muted-dark leading-relaxed">
              {a.visionParagraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-16 border-b-3 border-border-light dark:border-border-dark">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-2">{a.valuesEyebrow}</p>
        <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider mb-8">{a.valuesTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0">
          {a.values.map((v) => (
            <div key={v.prefix} className="border-3 border-border-light dark:border-border-dark p-6 -m-[1.5px] brutalist-hover">
              <p className="font-mono text-xs font-bold text-accent mb-3 tracking-wider">// {v.prefix}</p>
              <h3 className="text-base font-bold uppercase tracking-wider mb-2">{v.title}</h3>
              <p className="font-mono text-[13px] text-muted-light dark:text-muted-dark leading-relaxed">{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-12 py-16">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-2">{a.metricsEyebrow}</p>
        <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider mb-8">{a.metricsTitle}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {a.metrics.map((m, i) => (
            <StatBlock key={i} value={m.value} label={m.label} variant={(['accent', 'dark', 'teal', 'default'] as const)[i]} />
          ))}
        </div>
      </section>
    </div>
  )
}
