import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import ThemeToggle from './ThemeToggle'

const navLinks = [
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
  { to: '/team', label: 'Team' },
  { to: '/blog', label: 'Blog' },
] as const

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="border-b-3 border-accent bg-bg-light/90 dark:bg-bg-dark/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 md:px-12 h-16">
        <Link to="/" className="font-mono font-extrabold text-lg tracking-widest uppercase">
          HYPER<span className="bg-accent text-white px-1.5">CUBE</span>SPHERE
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="font-mono text-[13px] font-semibold uppercase tracking-wider px-4 py-2 border-2 border-transparent transition-colors hover:text-accent hover:border-accent"
              activeProps={{ className: 'text-accent border-accent' }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/contact"
            className="font-mono text-[13px] font-bold uppercase tracking-wider px-5 py-2 bg-accent text-white border-2 border-accent transition-colors hover:bg-transparent hover:text-accent ml-2"
          >
            Contact
          </Link>
          <div className="ml-3">
            <ThemeToggle />
          </div>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden font-mono text-xl p-2 cursor-pointer"
          aria-label="Toggle menu"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t-3 border-border-light dark:border-border-dark px-6 py-4 flex flex-col gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="font-mono text-sm font-semibold uppercase tracking-wider py-2 border-b-2 border-border-light dark:border-border-dark transition-colors hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/contact"
            onClick={() => setOpen(false)}
            className="font-mono text-sm font-bold uppercase tracking-wider py-2 bg-accent text-white text-center mt-2"
          >
            Contact
          </Link>
          <div className="mt-2">
            <ThemeToggle />
          </div>
        </div>
      )}
    </nav>
  )
}
