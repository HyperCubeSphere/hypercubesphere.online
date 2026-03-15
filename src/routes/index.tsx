import { createFileRoute, Link } from '@tanstack/react-router'
import ServiceCard from '../components/ServiceCard'
import StatBlock from '../components/StatBlock'
import { seo } from '../lib/seo'

export const Route = createFileRoute('/')({
  component: HomePage,
  head: () => ({
    ...seo({
      title: 'HyperCubeSphere — Strategic Software, AI Innovation & Security',
      description: 'HyperCubeSphere delivers strategic software solutions, AI innovation, and cybersecurity for forward-thinking enterprises.',
      path: '/',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'HyperCubeSphere',
        url: 'https://hypercubesphere.online',
        description: 'Security-first, engineer-led technology consulting agency offering AI, cybersecurity, cloud, data, and strategic advisory services to enterprises.',
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'info@hypercubesphere.online',
          contactType: 'customer service',
        },
      },
    }),
  }),
})

const services = [
  { number: '01', title: 'AI Engineering', description: 'Custom models, intelligent automation, and ML pipelines hardened for production.' },
  { number: '02', title: 'Software Strategy', description: 'Architecture, tech stacks, and roadmaps engineered to align with business targets.' },
  { number: '03', title: 'Cybersecurity', description: 'Penetration testing, red team ops, and zero-trust implementations at scale.' },
  { number: '04', title: 'Cloud Ops', description: 'Multi-cloud, Kubernetes orchestration, and infrastructure automation.' },
  { number: '05', title: 'Data Platforms', description: 'Real-time pipelines, data mesh architectures, and analytics at enterprise scale.' },
  { number: '06', title: 'Tech Advisory', description: 'CTO-level counsel, digital transformation strategy, and team augmentation.' },
]

const industries = [
  { name: 'Financial Services', prefix: 'FIN' },
  { name: 'Healthcare', prefix: 'MED' },
  { name: 'Defense & Government', prefix: 'GOV' },
  { name: 'Retail & E-Commerce', prefix: 'RET' },
  { name: 'Technology', prefix: 'TEC' },
  { name: 'Energy & Utilities', prefix: 'NRG' },
]

function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="px-6 md:px-12 py-16 md:py-24 border-b-3 border-border-light dark:border-border-dark">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 items-center">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">
              // Software × AI × Security
            </p>
            <h1 className="text-4xl md:text-[54px] font-extrabold leading-[1.05] tracking-tight mb-6 text-balance">
              We Engineer{' '}
              <span className="accent-highlight">Bold</span>{' '}
              Digital Futures
            </h1>
            <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-lg leading-relaxed mb-8">
              Strategic software solutions, AI innovation, and hardened cybersecurity for enterprises that build forward.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="bg-accent text-white border-3 border-accent px-8 py-4 font-mono text-[13px] font-extrabold uppercase tracking-widest glow-accent transition-[background-color,color] duration-200 hover:bg-transparent hover:text-accent touch-manipulation"
              >
                Work With Us →
              </Link>
              <Link
                to="/services"
                className="border-3 border-border-light dark:border-border-dark px-8 py-4 font-mono text-[13px] font-bold uppercase tracking-widest transition-[border-color,color] duration-200 hover:border-accent hover:text-accent touch-manipulation"
              >
                See Our Work
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatBlock value="50+" label="Systems Deployed" variant="accent" />
            <StatBlock value="99.9%" label="Uptime SLA" variant="dark" />
            <StatBlock value="6" label="Expert Team" variant="teal" />
            <StatBlock value="24/7" label="Threat Monitoring" />
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="flex flex-wrap justify-between items-center px-6 md:px-12 py-6 border-b-3 border-border-light dark:border-border-dark gap-4">
        {['Zero-Trust Architecture', 'ISO 27001', 'SOC 2 Type II', 'GDPR Compliant', '24/7 SOC'].map((item) => (
          <span key={item} className="font-mono text-[11px] uppercase tracking-[3px] text-muted-light dark:text-muted-dark font-semibold">
            <span className="text-accent mr-2">■</span>{item}
          </span>
        ))}
      </section>

      {/* Services Preview */}
      <section className="px-6 md:px-12 py-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b-3 border-border-light dark:border-border-dark pb-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-2">
              // What We Do
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider">
              Services
            </h2>
          </div>
          <span className="font-mono text-sm text-accent mt-2 md:mt-0">[ 01 — 06 ]</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.number} {...s} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            to="/services"
            className="font-mono text-sm font-bold uppercase tracking-widest text-accent hover:underline"
          >
            View All Services →
          </Link>
        </div>
      </section>

      {/* Industries */}
      <section className="px-6 md:px-12 py-16 border-t-3 border-border-light dark:border-border-dark">
        <div className="mb-8">
          <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-2">
            // Industries We Serve
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider">
            Sectors
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0">
          {industries.map((ind) => (
            <div
              key={ind.prefix}
              className="border-3 border-border-light dark:border-border-dark p-6 -m-[1.5px] text-center brutalist-hover"
            >
              <p className="font-mono text-xs text-accent font-bold mb-2">// {ind.prefix}</p>
              <p className="font-bold text-sm uppercase tracking-wider">{ind.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-6 md:px-12 py-20 border-t-3 border-accent text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">
          // Ready to Start?
        </p>
        <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-wider mb-6 max-w-2xl mx-auto text-balance">
          Let's Build Something{' '}
          <span className="accent-highlight">Extraordinary</span>
        </h2>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-lg mx-auto mb-8 leading-relaxed">
          Whether you need AI solutions, security hardening, or strategic software counsel — we're ready.
        </p>
        <Link
          to="/contact"
          className="inline-block bg-accent text-white border-3 border-accent px-10 py-4 font-mono text-sm font-extrabold uppercase tracking-widest glow-accent transition-[background-color,color] duration-200 hover:bg-transparent hover:text-accent touch-manipulation"
        >
          Start a Conversation →
        </Link>
      </section>
    </div>
  )
}
