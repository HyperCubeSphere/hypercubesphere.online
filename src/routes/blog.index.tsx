import { createFileRoute } from '@tanstack/react-router'
import BlogCard from '../components/BlogCard'
import { blogPosts } from '../data/blog-posts'
import { seo } from '../lib/seo'

export const Route = createFileRoute('/blog/')({
  component: BlogPage,
  head: () => ({
    ...seo({
      title: 'Blog — HyperCubeSphere',
      description: 'Technical insights, strategic perspectives, and lessons learned from the front lines of enterprise technology.',
      path: '/blog',
    }),
  }),
})

function BlogPage() {
  return (
    <div>
      {/* Hero */}
      <section className="px-6 md:px-12 py-16 md:py-24 border-b-3 border-border-light dark:border-border-dark">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">
          // Insights
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-6 max-w-2xl text-balance">
          Latest from{' '}
          <span className="accent-highlight">HyperCubeSphere</span>
        </h1>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-xl leading-relaxed">
          Technical insights, strategic perspectives, and lessons learned from the front lines of enterprise technology.
        </p>
      </section>

      {/* Blog Grid */}
      <section className="px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
          {blogPosts.map((post) => (
            <div key={post.slug} className="-m-[1.5px]">
              <BlogCard {...post} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
