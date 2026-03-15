import { Link } from '@tanstack/react-router'

interface BlogCardProps {
  slug: string
  title: string
  date: string
  excerpt: string
  category: string
  readTime: string
}

export default function BlogCard({ slug, title, date, excerpt, category, readTime }: BlogCardProps) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug }}
      className="border-3 border-border-light dark:border-border-dark p-6 block group relative z-0 transition-all hover:z-10 hover:border-accent hover:bg-hover-light dark:hover:bg-hover-dark hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0_var(--color-accent)]"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent">
          // {category}
        </span>
        <span className="font-mono text-[11px] text-muted-light dark:text-muted-dark">
          {readTime}
        </span>
      </div>
      <h3 className="text-base font-bold uppercase tracking-wider mb-2 group-hover:text-accent transition-colors">
        {title}
      </h3>
      <p className="font-mono text-[13px] text-muted-light dark:text-muted-dark leading-relaxed mb-3">
        {excerpt}
      </p>
      <p className="font-mono text-[11px] text-muted-light dark:text-muted-dark uppercase tracking-wider">
        {date}
      </p>
    </Link>
  )
}
