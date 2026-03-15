import { createFileRoute, Link } from '@tanstack/react-router'
import SectionHeader from '../components/SectionHeader'

export const Route = createFileRoute('/services')({
  component: ServicesPage,
  head: () => ({
    meta: [{ title: 'Services — HyperCubeSphere' }],
  }),
})

const services = [
  {
    number: '01',
    title: 'AI Engineering',
    description: 'We design and deploy production-grade AI systems that transform how enterprises operate. From custom ML models to intelligent automation pipelines, we build solutions that learn, adapt, and deliver measurable business value.',
    capabilities: ['Custom ML model development', 'Natural language processing', 'Computer vision systems', 'Predictive analytics pipelines', 'Intelligent process automation', 'AI strategy & governance'],
  },
  {
    number: '02',
    title: 'Software Strategy',
    description: 'We partner with technical and business leaders to make architecture decisions that stand the test of time. Our strategic approach ensures every line of code serves your business objectives and scales with your growth.',
    capabilities: ['Architecture consulting', 'Tech stack selection', 'System design & review', 'Technical roadmap planning', 'Code quality audits', 'Legacy modernization strategy'],
  },
  {
    number: '03',
    title: 'Cybersecurity',
    description: 'Security isn\'t an afterthought — it\'s the foundation. We implement comprehensive security programs that protect your assets, ensure compliance, and build resilience against evolving threats.',
    capabilities: ['Penetration testing & red teaming', 'Zero-trust implementation', 'SOC 2 & ISO 27001 compliance', 'Security architecture review', 'Incident response planning', 'Vulnerability management'],
  },
  {
    number: '04',
    title: 'Cloud Architecture',
    description: 'We architect cloud infrastructure that is resilient, cost-effective, and operationally excellent. Whether you\'re migrating or building cloud-native, we deliver infrastructure that performs at scale.',
    capabilities: ['Multi-cloud strategy', 'Kubernetes orchestration', 'Infrastructure as Code (Terraform)', 'Cloud migration planning', 'Cost optimization', 'High-availability design'],
  },
  {
    number: '05',
    title: 'Data Platforms',
    description: 'Data is only valuable when it\'s accessible, reliable, and actionable. We build modern data platforms that turn raw information into strategic advantage with real-time processing and analytics.',
    capabilities: ['Real-time data pipelines', 'Data mesh architecture', 'Data warehouse design', 'Analytics dashboards', 'ETL/ELT pipelines', 'Data governance frameworks'],
  },
  {
    number: '06',
    title: 'Strategic Consulting',
    description: 'When you need a trusted technology partner at the leadership level, we provide CTO-caliber guidance to navigate complex decisions, drive transformation, and accelerate your technology vision.',
    capabilities: ['CTO advisory services', 'Digital transformation strategy', 'Team augmentation & hiring', 'Technical due diligence', 'Technology roadmap development', 'Vendor evaluation & selection'],
  },
]

const differentiators = [
  { label: 'Security-First', description: 'Every solution is built with security at the foundation, not bolted on as an afterthought.' },
  { label: 'Battle-Tested', description: '50+ systems deployed across finance, healthcare, defense, and enterprise technology.' },
  { label: 'End-to-End', description: 'From strategy through implementation and ongoing operations — we own the full lifecycle.' },
  { label: 'Transparent', description: 'No black boxes. We document everything and transfer knowledge so your team can own it.' },
]

function ServicesPage() {
  return (
    <div>
      {/* Hero */}
      <section className="px-6 md:px-12 py-16 md:py-24 border-b-3 border-border-light dark:border-border-dark">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">
          // Our Expertise
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-6 max-w-2xl text-balance">
          Full-Spectrum Technology{' '}
          <span className="accent-highlight">Services</span>
        </h1>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-xl leading-relaxed">
          Six core practice areas. One mission: engineer solutions that are strategic, secure, and built to last.
        </p>
      </section>

      {/* Services Detail */}
      <section className="px-6 md:px-12 py-16">
        <SectionHeader eyebrow="// Services" title="What We Deliver" count="[ 01 — 06 ]" />
        <div className="space-y-0">
          {services.map((service) => (
            <div
              key={service.number}
              className="border-3 border-border-light dark:border-border-dark p-8 md:p-10 -mt-[3px] first:mt-0 group transition-[border-color,background-color] duration-200 relative z-0 hover:z-10 hover:border-accent hover:bg-hover-light dark:hover:bg-hover-dark"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8">
                <div>
                  <p className="font-mono text-xs font-bold text-accent mb-3 tracking-wider">
                    // {service.number}
                  </p>
                  <h3 className="text-xl font-extrabold uppercase tracking-wider mb-4">
                    {service.title}
                  </h3>
                  <p className="font-mono text-[13px] text-muted-light dark:text-muted-dark leading-relaxed">
                    {service.description}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent mb-4">
                    // Capabilities
                  </p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {service.capabilities.map((cap) => (
                      <li key={cap} className="font-mono text-[13px] text-muted-light dark:text-muted-dark flex items-start gap-2">
                        <span className="text-accent mt-0.5">■</span>
                        {cap}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why HyperCubeSphere */}
      <section className="px-6 md:px-12 py-16 border-t-3 border-border-light dark:border-border-dark">
        <SectionHeader eyebrow="// Why Us" title="The HyperCubeSphere Difference" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0">
          {differentiators.map((d, i) => (
            <div
              key={d.label}
              className="border-3 border-border-light dark:border-border-dark p-6 -m-[1.5px] brutalist-hover"
            >
              <p className="font-mono text-xs font-bold text-accent mb-3 tracking-wider">
                // 0{i + 1}
              </p>
              <h3 className="text-base font-bold uppercase tracking-wider mb-2">
                {d.label}
              </h3>
              <p className="font-mono text-[13px] text-muted-light dark:text-muted-dark leading-relaxed">
                {d.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-16 border-t-3 border-accent text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider mb-6">
          Need a Custom Solution?
        </h2>
        <Link
          to="/contact"
          className="inline-block bg-accent text-white border-3 border-accent px-10 py-4 font-mono text-sm font-extrabold uppercase tracking-widest glow-accent transition-[background-color,color] duration-200 hover:bg-transparent hover:text-accent touch-manipulation"
        >
          Let's Talk →
        </Link>
      </section>
    </div>
  )
}
