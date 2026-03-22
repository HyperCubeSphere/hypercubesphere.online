import { Link, rootRouteId, useMatch, useRouter } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  })

  return (
    <div className="min-w-0 flex-1 px-6 md:px-12 py-20 flex flex-col items-center justify-center">
      <p className="font-mono text-xs text-accent uppercase tracking-[3px] mb-4">// ERROR</p>
      <h1 className="text-3xl font-extrabold uppercase tracking-wider mb-4 text-center">
        Something Went Wrong
      </h1>
      <p className="text-sm text-muted-light dark:text-muted-dark max-w-md text-center mb-8 leading-relaxed">
        {error instanceof Error ? error.message : 'An unexpected error occurred.'}
      </p>
      <div className="flex gap-3 items-center flex-wrap justify-center">
        <button
          onClick={() => router.invalidate()}
          className="bg-accent text-white border-3 border-accent px-8 py-4 font-mono text-[13px] font-extrabold uppercase tracking-widest transition-[background-color,color] duration-200 hover:bg-transparent hover:text-accent cursor-pointer touch-manipulation"
        >
          Try Again
        </button>
        {isRoot ? (
          <Link
            to="/"
            className="border-3 border-border-light dark:border-border-dark px-8 py-4 font-mono text-[13px] font-bold uppercase tracking-widest transition-[border-color,color] duration-200 hover:border-accent hover:text-accent"
          >
            Home
          </Link>
        ) : (
          <button
            onClick={() => window.history.back()}
            className="border-3 border-border-light dark:border-border-dark px-8 py-4 font-mono text-[13px] font-bold uppercase tracking-widest transition-[border-color,color] duration-200 hover:border-accent hover:text-accent cursor-pointer touch-manipulation"
          >
            Go Back
          </button>
        )}
      </div>
    </div>
  )
}
