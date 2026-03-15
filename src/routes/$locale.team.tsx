import { createFileRoute } from '@tanstack/react-router'
import TeamCard from '../components/TeamCard'
import { useI18n } from '../i18n'
import { seo } from '../lib/seo'
import { getTranslation } from '../i18n/translations'

export const Route = createFileRoute('/$locale/team')({
  component: TeamPage,
  head: ({ params }) => { const t = getTranslation(params.locale); return {
    ...seo({ title: t.team.seoTitle, description: t.team.seoDescription, path: '/team', locale: params.locale }),
  }},
})

function TeamPage() {
  const { t } = useI18n()
  const tm = t.team

  return (
    <div>
      <section className="px-6 md:px-12 py-16 md:py-24 border-b-3 border-border-light dark:border-border-dark">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">{tm.eyebrow}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-6 max-w-2xl text-balance">
          {tm.headingPre}<span className="accent-highlight">{tm.headingBold}</span>
        </h1>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-xl leading-relaxed">{tm.subtitle}</p>
      </section>

      <section className="px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tm.members.map((member) => (
            <div key={member.initials}>
              <TeamCard {...member} />
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-12 py-16 border-t-3 border-accent text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">{tm.careersEyebrow}</p>
        <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider mb-4">{tm.careersTitle}</h2>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-lg mx-auto mb-6 leading-relaxed">{tm.careersSubtitle}</p>
        <a href="mailto:careers@hypercubesphere.online" className="inline-block bg-accent text-white border-3 border-accent px-10 py-4 font-mono text-sm font-extrabold uppercase tracking-widest glow-accent transition-[background-color,color] duration-200 hover:bg-transparent hover:text-accent touch-manipulation">{tm.careersButton}</a>
      </section>
    </div>
  )
}
