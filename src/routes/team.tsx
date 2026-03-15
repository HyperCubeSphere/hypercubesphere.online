import { createFileRoute } from '@tanstack/react-router'
import TeamCard from '../components/TeamCard'

export const Route = createFileRoute('/team')({
  component: TeamPage,
  head: () => ({
    meta: [{ title: 'Team — HyperCubeSphere' }],
  }),
})

const team = [
  {
    name: 'Alexandra Chen',
    role: 'CEO & Founder',
    bio: 'Former strategy director at a Big Four consultancy. 15 years driving digital transformation for Fortune 500 companies. Obsessed with aligning technology investments to business outcomes.',
    initials: 'AC',
    color: 'bg-accent',
  },
  {
    name: 'Marcus Okonkwo',
    role: 'CTO',
    bio: 'Ex-principal engineer at a hyperscaler. Built distributed systems processing 10M+ events/sec. Believes great architecture is invisible — you only notice it when it\'s missing.',
    initials: 'MO',
    color: 'bg-[#0f0f18] border border-accent',
  },
  {
    name: 'Dr. Priya Sharma',
    role: 'Head of AI',
    bio: 'PhD in Machine Learning from ETH Zurich. Published researcher in NLP and computer vision. Bridges the gap between cutting-edge research and production-ready AI systems.',
    initials: 'PS',
    color: 'bg-teal-tint border border-accent/30',
  },
  {
    name: 'James Thornton',
    role: 'Head of Security',
    bio: 'Former government cybersecurity analyst. CISSP, OSCP certified. Led incident response for critical infrastructure. Thinks like an attacker, builds like a defender.',
    initials: 'JT',
    color: 'bg-accent',
  },
  {
    name: 'Elena Vasquez',
    role: 'Lead Engineer',
    bio: 'Full-stack architect with deep expertise in cloud-native systems. 10+ years shipping production code across fintech and healthtech. Champions clean code and pragmatic engineering.',
    initials: 'EV',
    color: 'bg-[#0f0f18] border border-accent',
  },
  {
    name: 'David Kim',
    role: 'Head of Operations',
    bio: 'PMP certified with experience managing complex technology programs across 3 continents. Ensures every project ships on time, on budget, and exceeds expectations.',
    initials: 'DK',
    color: 'bg-teal-tint border border-accent/30',
  },
]

function TeamPage() {
  return (
    <div>
      {/* Hero */}
      <section className="px-6 md:px-12 py-16 md:py-24 border-b-3 border-border-light dark:border-border-dark">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">
          // Our Team
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-6 max-w-2xl">
          The People Behind{' '}
          <span className="accent-highlight">The Code</span>
        </h1>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-xl leading-relaxed">
          Six specialists. Decades of combined experience. One shared commitment to engineering excellence.
        </p>
      </section>

      {/* Team Grid */}
      <section className="px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {team.map((member) => (
            <div key={member.initials}>
              <TeamCard {...member} />
            </div>
          ))}
        </div>
      </section>

      {/* Join CTA */}
      <section className="px-6 md:px-12 py-16 border-t-3 border-accent text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">
          // Careers
        </p>
        <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider mb-4">
          Want to Join the Team?
        </h2>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-lg mx-auto mb-6 leading-relaxed">
          We're always looking for exceptional engineers and strategists who thrive on hard problems.
        </p>
        <a
          href="mailto:careers@hypercubesphere.online"
          className="inline-block bg-accent text-white border-3 border-accent px-10 py-4 font-mono text-sm font-extrabold uppercase tracking-widest glow-accent transition-colors hover:bg-transparent hover:text-accent"
        >
          Get in Touch →
        </a>
      </section>
    </div>
  )
}
