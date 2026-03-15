import { createFileRoute } from '@tanstack/react-router'
import ContactForm from '../components/ContactForm'
import { useI18n } from '../i18n'
import { seo } from '../lib/seo'
import { getTranslation } from '../i18n/translations'

export const Route = createFileRoute('/$locale/contact')({
  component: ContactPage,
  head: ({ params }) => { const t = getTranslation(params.locale); return {
    ...seo({ title: t.contact.seoTitle, description: t.contact.seoDescription, path: '/contact', locale: params.locale }),
  }},
})

function ContactPage() {
  const { t } = useI18n()
  const c = t.contact

  return (
    <div>
      <section className="px-6 md:px-12 py-16 md:py-24 border-b-3 border-border-light dark:border-border-dark">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">{c.eyebrow}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-6 max-w-2xl text-balance">
          {c.headingPre}<span className="accent-highlight">{c.headingBold}</span>
        </h1>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-xl leading-relaxed">{c.subtitle}</p>
      </section>

      <section className="px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-6">{c.formEyebrow}</p>
            <ContactForm />
          </div>
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-6">{c.detailsEyebrow}</p>
            <div className="space-y-0">
              {c.info.map((info) => (
                <div key={info.prefix} className="border-3 border-border-light dark:border-border-dark p-4 -mt-[3px] first:mt-0">
                  <p className="font-mono text-[11px] font-bold text-accent uppercase tracking-widest mb-1">// {info.prefix}</p>
                  <p className="font-bold text-xs uppercase tracking-wider mb-0.5">{info.label}</p>
                  <p className="font-mono text-[12px] text-muted-dark">{info.value}</p>
                </div>
              ))}
            </div>
            <div className="border-3 border-border-light dark:border-border-dark p-4 mt-4">
              <p className="font-mono text-[11px] font-bold text-accent uppercase tracking-widest mb-3">{c.connectEyebrow}</p>
              <div className="space-y-1.5">
                {c.socials.map((platform) => (
                  <a key={platform.label} href={platform.href} target="_blank" rel="noopener noreferrer" className="font-mono text-[12px] text-muted-dark hover:text-accent transition-[color] duration-200 block">
                    ■ {platform.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
