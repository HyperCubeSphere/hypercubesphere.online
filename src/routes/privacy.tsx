import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
  head: () => ({
    meta: [{ title: 'Privacy Policy — HyperCubeSphere' }],
  }),
})

const sections = [
  {
    number: '01',
    title: 'Information We Collect',
    content: 'We collect information you provide directly, such as your name, email address, company name, and message content when you use our contact form. We also collect standard web analytics data including IP addresses, browser type, pages visited, and time spent on our site. We do not collect sensitive personal data unless explicitly provided by you in the context of a consulting engagement.',
  },
  {
    number: '02',
    title: 'How We Use Your Information',
    content: 'We use collected information to respond to your inquiries, provide requested services, improve our website and user experience, send relevant updates about our services (with your consent), comply with legal obligations, and protect the security of our systems and users.',
  },
  {
    number: '03',
    title: 'Data Sharing and Disclosure',
    content: 'We do not sell, trade, or rent your personal information to third parties. We may share data with trusted service providers who assist in operating our website and conducting our business (subject to confidentiality agreements), when required by law or legal process, or to protect the rights, property, or safety of HyperCubeSphere, our clients, or others.',
  },
  {
    number: '04',
    title: 'Data Security',
    content: 'As a cybersecurity-focused company, we take data protection seriously. We implement industry-standard security measures including encryption in transit (TLS 1.3) and at rest, access controls based on the principle of least privilege, regular security audits and penetration testing, and incident response procedures. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.',
  },
  {
    number: '05',
    title: 'Your Rights',
    content: 'Depending on your jurisdiction, you may have the right to access, correct, or delete your personal data, object to or restrict processing of your data, data portability, withdraw consent at any time, and lodge a complaint with a supervisory authority. To exercise these rights, contact us at privacy@hypercubesphere.online.',
  },
  {
    number: '06',
    title: 'Cookies',
    content: 'We use essential cookies to ensure our website functions properly. We may use analytics cookies to understand how visitors interact with our site. You can control cookie preferences through your browser settings. We do not use cookies for advertising or tracking purposes.',
  },
  {
    number: '07',
    title: 'Changes to This Policy',
    content: 'We may update this privacy policy from time to time to reflect changes in our practices or applicable laws. We will post the updated policy on this page with a revised "last updated" date. We encourage you to review this policy periodically.',
  },
  {
    number: '08',
    title: 'Contact Us',
    content: 'If you have questions about this privacy policy or our data practices, please contact us at privacy@hypercubesphere.online. For security-related concerns, contact security@hypercubesphere.online.',
  },
]

function PrivacyPage() {
  return (
    <div>
      {/* Hero */}
      <section className="px-6 md:px-12 py-16 md:py-24 border-b-3 border-border-light dark:border-border-dark">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">
          // Legal
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-6 text-balance">
          Privacy Policy
        </h1>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark">
          Last updated: March 2026
        </p>
      </section>

      {/* Intro */}
      <section className="px-6 md:px-12 py-10 border-b-3 border-border-light dark:border-border-dark">
        <p className="font-mono text-[14px] text-muted-light dark:text-muted-dark leading-relaxed max-w-3xl">
          HyperCubeSphere ("we," "our," or "us") is committed to protecting your privacy. This policy describes how we collect, use, and safeguard your personal information when you visit our website or use our services.
        </p>
      </section>

      {/* Sections */}
      <section className="px-6 md:px-12 py-16">
        <div className="max-w-3xl space-y-0">
          {sections.map((section) => (
            <div
              key={section.number}
              className="border-3 border-border-light dark:border-border-dark p-8 -mt-[3px] first:mt-0"
            >
              <p className="font-mono text-xs font-bold text-accent mb-3 tracking-wider">
                // {section.number}
              </p>
              <h2 className="text-lg font-extrabold uppercase tracking-wider mb-4">
                {section.title}
              </h2>
              <p className="font-mono text-[13px] text-muted-light dark:text-muted-dark leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
