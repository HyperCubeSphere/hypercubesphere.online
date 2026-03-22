import { createFileRoute } from '@tanstack/react-router'
import TeamCard from '../components/TeamCard'
import { useI18n } from '../i18n'
import { seo } from '../lib/seo'
import { getTranslation } from '../i18n/translations'

const memberImages: Record<string, string> = {
  TV: '/team/ted-vortex.jpg',
  AC: '/team/alexandru-chirica.jpg',
  OS: '/team/ogbonna-sunday.jpg',
  MA: '/team/morgan-ambrose.jpg',
  IA: '/team/ise-andrei.jpg',
}

const memberSocials: Record<string, Array<{ type: 'linkedin' | 'github' | 'website'; url: string }>> = {
  TV: [
    { type: 'linkedin', url: 'https://linkedin.com/in/tedvortex' },
    { type: 'github', url: 'https://github.com/0-vortex' },
    { type: 'website', url: 'https://vortex.name' },
  ],
  AC: [
    { type: 'linkedin', url: 'https://linkedin.com/in/alexandrumarianchirica' },
    { type: 'github', url: 'https://github.com/alexandru-chirica' },
  ],
  MA: [
    { type: 'linkedin', url: 'https://linkedin.com/in/morganrequiem' },
  ],
  OS: [
    { type: 'linkedin', url: 'https://linkedin.com/in/ogbonnasunday' },
    { type: 'github', url: 'https://github.com/OgDev-01' },
    { type: 'website', url: 'https://ogbonna.dev' },
  ],
  IA: [
    { type: 'linkedin', url: 'https://linkedin.com/in/ise-andrei-949694229' },
    { type: 'github', url: 'https://github.com/h1ve-sp4wn' },
  ],
}

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
      <section className="border-b-3 border-border-light dark:border-border-dark">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-16 md:py-24">
          <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">{tm.eyebrow}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-6 max-w-2xl text-balance">
            {tm.headingPre}<span className="accent-highlight">{tm.headingBold}</span>
          </h1>
          <p className="text-sm text-muted-light dark:text-muted-dark max-w-xl leading-relaxed">{tm.subtitle}</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tm.members.map((member) => (
              <div key={member.initials}>
                <TeamCard {...member} image={memberImages[member.initials]} socials={memberSocials[member.initials]} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t-3 border-accent">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-24 md:py-32">
          <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">{tm.careersEyebrow}</p>
          <h2 className="text-3xl md:text-5xl font-extrabold leading-[1.05] tracking-tight mb-4 max-w-2xl">{tm.careersTitle}</h2>
          <p className="text-sm text-muted-light dark:text-muted-dark max-w-lg mb-8 leading-relaxed">{tm.careersSubtitle}</p>
          <a href="mailto:careers@hypercubesphere.online" className="inline-block bg-accent text-white border-3 border-accent px-10 py-4 font-mono text-sm font-extrabold uppercase tracking-widest glow-accent transition-[background-color,color] duration-200 hover:bg-transparent hover:text-accent touch-manipulation">{tm.careersButton}</a>
        </div>
      </section>
    </div>
  )
}
