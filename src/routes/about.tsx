import { createFileRoute } from '@tanstack/react-router'
import StatBlock from '../components/StatBlock'

export const Route = createFileRoute('/about')({
  component: AboutPage,
  head: () => ({
    meta: [{ title: 'About — HyperCubeSphere' }],
  }),
})

const values = [
  { prefix: 'INN', title: 'Innovation', description: 'We push boundaries with emerging technologies, always exploring what\'s next while delivering what works today.' },
  { prefix: 'SEC', title: 'Security', description: 'Security is woven into every decision, every architecture, every line of code. It\'s not a feature — it\'s a principle.' },
  { prefix: 'INT', title: 'Integrity', description: 'We build trust through transparency, honest counsel, and delivering on our commitments without exception.' },
  { prefix: 'EXC', title: 'Excellence', description: 'Good enough isn\'t. We hold ourselves to the highest engineering standards and continuously raise the bar.' },
]

function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="px-6 md:px-12 py-16 md:py-24 border-b-3 border-border-light dark:border-border-dark">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">
          // About Us
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-6 max-w-2xl">
          Engineering the{' '}
          <span className="accent-highlight">Future</span>{' '}
          of Enterprise Technology
        </h1>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-xl leading-relaxed">
          HyperCubeSphere was founded on a simple conviction: enterprises deserve technology partners who think in dimensions, not just deliverables.
        </p>
      </section>

      {/* Story */}
      <section className="px-6 md:px-12 py-16 border-b-3 border-border-light dark:border-border-dark">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">
              // Our Story
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider mb-6">
              Born from Complexity
            </h2>
            <div className="space-y-4 font-mono text-[13px] text-muted-light dark:text-muted-dark leading-relaxed">
              <p>
                HyperCubeSphere emerged from a team of engineers who spent years inside the world's most demanding technology environments — financial trading systems, defense platforms, and healthcare infrastructure where failure isn't an option.
              </p>
              <p>
                We saw the same pattern everywhere: companies investing millions in technology without a strategic framework. Great engineers building the wrong things. Security treated as compliance theater. AI initiatives that never left the lab.
              </p>
              <p>
                So we built HyperCubeSphere to be different. A company where strategic thinking and engineering excellence coexist. Where security is a first-class citizen. Where AI is practical, not theoretical.
              </p>
            </div>
          </div>
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">
              // Our Vision
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider mb-6">
              Multi-Dimensional Solutions
            </h2>
            <div className="space-y-4 font-mono text-[13px] text-muted-light dark:text-muted-dark leading-relaxed">
              <p>
                Our name reflects our philosophy. A hypercube exists in dimensions beyond what's visible — and so does great technology strategy. We see connections between systems, teams, and business goals that others miss.
              </p>
              <p>
                A sphere represents completeness and resilience — the shape that withstands pressure equally from all directions. That's the kind of systems we build: robust, balanced, and complete.
              </p>
              <p>
                Together, HyperCubeSphere represents our commitment to building technology that operates at a higher dimension of quality, security, and strategic value.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="px-6 md:px-12 py-16 border-b-3 border-border-light dark:border-border-dark">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-2">
          // Core Values
        </p>
        <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider mb-8">
          What Drives Us
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0">
          {values.map((v) => (
            <div
              key={v.prefix}
              className="border-3 border-border-light dark:border-border-dark p-6 -m-[1.5px] brutalist-hover"
            >
              <p className="font-mono text-xs font-bold text-accent mb-3 tracking-wider">
                // {v.prefix}
              </p>
              <h3 className="text-base font-bold uppercase tracking-wider mb-2">
                {v.title}
              </h3>
              <p className="font-mono text-[13px] text-muted-light dark:text-muted-dark leading-relaxed">
                {v.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section className="px-6 md:px-12 py-16">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-2">
          // By the Numbers
        </p>
        <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider mb-8">
          Track Record
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBlock value="5+" label="Years in Business" variant="accent" />
          <StatBlock value="50+" label="Projects Delivered" variant="dark" />
          <StatBlock value="6" label="Team Members" variant="teal" />
          <StatBlock value="12+" label="Countries Served" />
        </div>
      </section>
    </div>
  )
}
