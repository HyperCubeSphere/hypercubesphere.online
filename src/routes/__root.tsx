import { HeadContent, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import { locales } from '../i18n/config'
import appCss from '../styles.css?url'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark')?stored:'dark';var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(mode);root.style.colorScheme=mode;var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=mode==='dark'?'#08080c':'#fffef5';}catch(e){}})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'HyperCubeSphere — Strategic Software, AI Innovation & Security' },
      { name: 'description', content: 'HyperCubeSphere delivers strategic software solutions, AI innovation, and cybersecurity for forward-thinking enterprises.' },
      { name: 'theme-color', content: '#08080c' },
      { property: 'og:site_name', content: 'HyperCubeSphere' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&family=Space+Grotesk:wght@400;600;700;800&display=swap' },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'HyperCubeSphere',
          url: 'https://hypercubesphere.online',
          publisher: {
            '@type': 'Organization',
            name: 'HyperCubeSphere',
            url: 'https://hypercubesphere.online',
            sameAs: [
              'https://github.com/HyperCubeSphere',
              'https://linkedin.com',
              'https://x.com',
            ],
          },
        }),
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const segments = pathname.split('/')
  const lang = locales.includes(segments[1] as any) ? segments[1] : 'en'

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <div className="grid-overlay" aria-hidden="true" />
        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
        <Scripts />
      </body>
    </html>
  )
}
