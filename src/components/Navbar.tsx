import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useI18n } from '../i18n'
import ThemeToggle from './ThemeToggle'
import LanguageSwitcher from './LanguageSwitcher'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { locale, t } = useI18n()

  const navLinks = [
    { to: '/$locale/services' as const, label: t.nav.services },
    { to: '/$locale/about' as const, label: t.nav.about },
    { to: '/$locale/team' as const, label: t.nav.team },
    { to: '/$locale/blog' as const, label: t.nav.blog },
  ]

  return (
    <nav className="border-b-3 border-accent bg-bg-light dark:bg-bg-dark sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 md:px-12 h-16 max-w-[1400px] mx-auto w-full">
        <Link to="/$locale" params={{ locale }} className="font-mono font-extrabold text-lg tracking-widest uppercase">
          HYPER<span className="bg-accent text-white px-1.5">CUBE</span>SPHERE
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              params={{ locale }}
              className="font-mono text-[13px] font-semibold uppercase tracking-wider px-4 py-2 border-2 border-transparent transition-[color,border-color] duration-200 hover:text-accent hover:border-accent"
              activeProps={{ className: 'text-accent border-accent' }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/$locale/contact"
            params={{ locale }}
            className="font-mono text-[13px] font-bold uppercase tracking-wider px-5 py-2 bg-accent text-white border-2 border-accent transition-[background-color,color] duration-200 hover:bg-transparent hover:text-accent ml-2 touch-manipulation"
          >
            {t.nav.contact}
          </Link>
          <div className="ml-3">
            <ThemeToggle />
          </div>
          <div className="ml-2">
            <LanguageSwitcher />
          </div>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden font-mono text-xl p-2 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation"
          aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
          aria-expanded={open}
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      <div className={`md:hidden grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="border-t-3 border-border-light dark:border-border-dark px-6 py-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                params={{ locale }}
                onClick={() => setOpen(false)}
                className="font-mono text-sm font-semibold uppercase tracking-wider py-3 min-h-[44px] border-b-2 border-border-light dark:border-border-dark transition-[color] duration-200 hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/$locale/contact"
              params={{ locale }}
              onClick={() => setOpen(false)}
              className="font-mono text-sm font-bold uppercase tracking-wider py-3 min-h-[44px] bg-accent text-white text-center mt-2 flex items-center justify-center"
            >
              {t.nav.contact}
            </Link>
            <div className="mt-2 flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
