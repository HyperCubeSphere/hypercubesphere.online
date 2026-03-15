import { createFileRoute } from '@tanstack/react-router'
import { useI18n } from '../i18n'
import { seo } from '../lib/seo'
import { getTranslation } from '../i18n/translations'

export const Route = createFileRoute('/$locale/privacy')({
  component: PrivacyPage,
  head: ({ params }) => { const t = getTranslation(params.locale); return {
    ...seo({ title: t.privacy.seoTitle, description: t.privacy.seoDescription, path: '/privacy', locale: params.locale }),
  }},
})

function PrivacyPage() {
  const { t } = useI18n()
  const p = t.privacy

  return (
    <div>
      <section className="px-6 md:px-12 py-16 md:py-24 border-b-3 border-border-light dark:border-border-dark">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">{p.eyebrow}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-6 text-balance">{p.title}</h1>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark">{p.lastUpdated}</p>
      </section>

      <section className="px-6 md:px-12 py-10 border-b-3 border-border-light dark:border-border-dark">
        <p className="font-mono text-[14px] text-muted-light dark:text-muted-dark leading-relaxed max-w-3xl">{p.intro}</p>
      </section>

      <section className="px-6 md:px-12 py-16">
        <div className="max-w-3xl space-y-0">
          {p.sections.map((section) => (
            <div key={section.number} className="border-3 border-border-light dark:border-border-dark p-8 -mt-[3px] first:mt-0">
              <p className="font-mono text-xs font-bold text-accent mb-3 tracking-wider">// {section.number}</p>
              <h2 className="text-lg font-extrabold uppercase tracking-wider mb-4">{section.title}</h2>
              <p className="font-mono text-[13px] text-muted-light dark:text-muted-dark leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
