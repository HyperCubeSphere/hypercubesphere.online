import { Link } from '@tanstack/react-router'

export function NotFound({ children }: { children?: any }) {
  return (
    <div className="px-6 md:px-12 py-20 flex flex-col items-center justify-center">
      <p className="font-mono text-xs text-accent uppercase tracking-[3px] mb-4">// 404</p>
      <h1 className="text-3xl font-extrabold uppercase tracking-wider mb-4 text-center">
        Page Not Found
      </h1>
      <div className="text-sm text-muted-light dark:text-muted-dark max-w-md text-center mb-8 leading-relaxed">
        {children || <p>The page you are looking for does not exist.</p>}
      </div>
      <div className="flex gap-3 items-center flex-wrap justify-center">
        <button
          onClick={() => window.history.back()}
          className="bg-accent text-white border-3 border-accent px-8 py-4 font-mono text-[13px] font-extrabold uppercase tracking-widest transition-[background-color,color] duration-200 hover:bg-transparent hover:text-accent cursor-pointer touch-manipulation"
        >
          Go Back
        </button>
        <Link
          to="/"
          className="border-3 border-border-light dark:border-border-dark px-8 py-4 font-mono text-[13px] font-bold uppercase tracking-widest transition-[border-color,color] duration-200 hover:border-accent hover:text-accent"
        >
          Start Over
        </Link>
      </div>
    </div>
  )
}
