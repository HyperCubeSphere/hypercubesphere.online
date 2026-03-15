import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { blogPosts } from '../data/blog-posts'
import { seo } from '../lib/seo'

export const Route = createFileRoute('/blog/$slug')({
  component: BlogPostPage,
  head: ({ params }) => {
    const post = blogPosts.find((p) => p.slug === params.slug)
    if (!post) {
      return { meta: [{ title: 'Post Not Found — HyperCubeSphere' }] }
    }
    return {
      ...seo({
        title: `${post.title} — HyperCubeSphere`,
        description: post.excerpt,
        path: `/blog/${post.slug}`,
        type: 'article',
        article: {
          publishedTime: new Date(post.date).toISOString().split('T')[0],
          section: post.category,
        },
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.excerpt,
          datePublished: new Date(post.date).toISOString().split('T')[0],
          author: {
            '@type': 'Organization',
            name: 'HyperCubeSphere',
          },
          publisher: {
            '@type': 'Organization',
            name: 'HyperCubeSphere',
          },
        },
      }),
    }
  },
})

function BlogPostPage() {
  const { slug } = Route.useParams()
  const post = blogPosts.find((p) => p.slug === slug)

  if (!post) {
    return (
      <div className="px-6 md:px-12 py-20 text-center">
        <p className="font-mono text-xs text-accent uppercase tracking-[3px] mb-4">// 404</p>
        <h1 className="text-3xl font-extrabold uppercase tracking-wider mb-4">Post Not Found</h1>
        <Link to="/blog" className="font-mono text-sm text-accent hover:underline">
          ← Back to Blog
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <section className="px-6 md:px-12 py-16 md:py-24 border-b-3 border-border-light dark:border-border-dark">
        <Link to="/blog" className="font-mono text-xs text-accent uppercase tracking-widest hover:underline mb-6 inline-block">
          ← Back to Blog
        </Link>
        <div className="flex items-center gap-4 mb-4">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent">
            // {post.category}
          </span>
          <span className="font-mono text-[11px] text-muted-light dark:text-muted-dark">
            {post.readTime}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight mb-4 max-w-3xl text-balance">
          {post.title}
        </h1>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark">
          {post.date}
        </p>
      </section>

      {/* Content */}
      <section className="px-6 md:px-12 py-16 max-w-3xl">
        <div className="space-y-6">
          {post.content.split('\n\n').map((paragraph, i) => (
            <p key={i} className="font-mono text-[14px] leading-relaxed text-muted-light dark:text-muted-dark">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {/* Back CTA */}
      <section className="px-6 md:px-12 py-10 border-t-3 border-border-light dark:border-border-dark">
        <Link to="/blog" className="font-mono text-sm text-accent font-bold uppercase tracking-widest hover:underline">
          ← All Posts
        </Link>
      </section>
    </div>
  )
}
