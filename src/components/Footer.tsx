import { Link } from '@tanstack/react-router'

export default function Footer() {
  return (
    <footer className="border-t-3 border-accent mt-20">
      <div className="px-6 md:px-12 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <Link to="/" className="font-mono font-extrabold text-base tracking-widest uppercase block mb-2">
              HYPER<span className="bg-accent text-white px-1.5">CUBE</span>SPHERE
            </Link>
            <p className="font-mono text-xs text-muted-light dark:text-muted-dark uppercase tracking-wider" suppressHydrationWarning>
              © {new Date().getFullYear()} HyperCubeSphere. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap gap-6">
            {[
              { to: '/services', label: 'Services' },
              { to: '/about', label: 'About' },
              { to: '/team', label: 'Team' },
              { to: '/blog', label: 'Blog' },
              { to: '/contact', label: 'Contact' },
              { to: '/privacy', label: 'Privacy' },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="font-mono text-xs uppercase tracking-wider text-muted-light dark:text-muted-dark hover:text-accent transition-[color] duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="border-t border-border-light dark:border-border-dark mt-8 pt-6">
          <p className="font-mono text-xs text-muted-light dark:text-muted-dark uppercase tracking-wider">
            info@hypercubesphere.online
          </p>
        </div>
      </div>
    </footer>
  )
}
