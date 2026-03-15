import { createFileRoute } from '@tanstack/react-router'
import ContactForm from '../components/ContactForm'

export const Route = createFileRoute('/contact')({
  component: ContactPage,
  head: () => ({
    meta: [{ title: 'Contact — HyperCubeSphere' }],
  }),
})

const contactInfo = [
  { label: 'Email', value: 'info@hypercubesphere.online', prefix: 'EML' },
  { label: 'Response Time', value: 'Within 24 hours', prefix: 'SLA' },
  { label: 'Location', value: 'Remote-First, Global Operations', prefix: 'LOC' },
]

function ContactPage() {
  return (
    <div>
      {/* Hero */}
      <section className="px-6 md:px-12 py-16 md:py-24 border-b-3 border-border-light dark:border-border-dark">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">
          // Get In Touch
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-6 max-w-2xl">
          Let's Build Something{' '}
          <span className="accent-highlight">Together</span>
        </h1>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-xl leading-relaxed">
          Whether you have a specific project in mind or want to explore how we can help — we're ready to talk.
        </p>
      </section>

      {/* Form + Info */}
      <section className="px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12">
          {/* Form */}
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-6">
              // Send a Message
            </p>
            <ContactForm />
          </div>

          {/* Contact Info */}
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-6">
              // Contact Details
            </p>
            <div className="space-y-0">
              {contactInfo.map((info) => (
                <div
                  key={info.prefix}
                  className="border-3 border-border-light dark:border-border-dark p-4 -mt-[3px] first:mt-0"
                >
                  <p className="font-mono text-[11px] font-bold text-accent uppercase tracking-widest mb-1">
                    // {info.prefix}
                  </p>
                  <p className="font-bold text-xs uppercase tracking-wider mb-0.5">
                    {info.label}
                  </p>
                  <p className="font-mono text-[12px] text-muted-dark">
                    {info.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Social */}
            <div className="border-3 border-border-light dark:border-border-dark p-4 mt-4">
              <p className="font-mono text-[11px] font-bold text-accent uppercase tracking-widest mb-3">
                // Connect
              </p>
              <div className="space-y-1.5">
                {['LinkedIn', 'GitHub', 'X / Twitter'].map((platform) => (
                  <p key={platform} className="font-mono text-[12px] text-muted-dark hover:text-accent transition-colors cursor-pointer">
                    ■ {platform}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
