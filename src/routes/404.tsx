import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/404')({
  component: NotFoundPage,
  head: () => ({
    meta: [{ title: '404 — HyperCubeSphere' }],
  }),
})

function NotFoundPage() {
  return (
    <div className="px-6 md:px-12 py-20 text-center">
      <p className="font-mono text-xs text-accent uppercase tracking-[3px] mb-4">// 404</p>
      <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-wider mb-6 text-balance">Page Not Found</h1>
      <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-md mx-auto mb-8 leading-relaxed">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/$locale" params={{ locale: 'en' }} className="inline-block bg-accent text-white border-3 border-accent px-10 py-4 font-mono text-sm font-extrabold uppercase tracking-widest glow-accent transition-[background-color,color] duration-200 hover:bg-transparent hover:text-accent touch-manipulation">
        Back to Home →
      </Link>
    </div>
  )
}
