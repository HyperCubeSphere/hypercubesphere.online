import { Link } from '@tanstack/react-router'
import { useI18n } from '../i18n'

export default function Footer() {
  const { locale, t } = useI18n()

  const links = [
    { to: '/$locale/services' as const, label: t.nav.services },
    { to: '/$locale/about' as const, label: t.nav.about },
    { to: '/$locale/team' as const, label: t.nav.team },
    { to: '/$locale/blog' as const, label: t.nav.blog },
    { to: '/$locale/contact' as const, label: t.nav.contact },
    { to: '/$locale/privacy' as const, label: t.nav.privacy },
  ]

  return (
    <footer className="border-t-3 border-accent mt-20">
      <div className="px-6 md:px-12 py-10 max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <Link to="/$locale" params={{ locale }} className="font-mono font-extrabold text-base tracking-widest uppercase block mb-2">
              HYPER<span className="bg-accent text-white px-1.5">CUBE</span>SPHERE
            </Link>
            <p className="font-mono text-xs text-muted-light dark:text-muted-dark uppercase tracking-wider" suppressHydrationWarning>
              {t.footer.rights.replace('{year}', String(new Date().getFullYear()))}
            </p>
          </div>
          <div className="flex flex-wrap gap-6">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                params={{ locale }}
                className="font-mono text-xs uppercase tracking-wider hover:text-accent transition-[color] duration-200"
                activeProps={{ className: 'text-accent' }}
                inactiveProps={{ className: 'text-muted-light dark:text-muted-dark' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="border-t-3 border-border-light dark:border-border-dark mt-8 pt-6">
          <a href="mailto:info@hypercubesphere.online" className="font-mono text-xs text-muted-light dark:text-muted-dark uppercase tracking-wider hover:text-accent transition-[color] duration-200">
            info@hypercubesphere.online
          </a>
        </div>
      </div>
    </footer>
  )
}
