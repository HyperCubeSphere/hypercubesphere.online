import { createFileRoute, Link } from '@tanstack/react-router'
import { useI18n } from '../i18n'
import { seo } from '../lib/seo'
import { getTranslation } from '../i18n/translations'

export const Route = createFileRoute('/$locale/blog/$slug')({
  component: BlogPostPage,
  head: ({ params }) => {
    const t = getTranslation(params.locale)
    const post = t.blog.posts.find((p: any) => p.slug === params.slug)
    if (!post) return { meta: [{ title: 'Post Not Found — HyperCubeSphere' }] }
    return {
      ...seo({
        title: `${post.title} — HyperCubeSphere`,
        description: post.excerpt,
        path: `/blog/${post.slug}`,
        locale: params.locale,
        type: 'article',
        article: { publishedTime: post.dateISO, section: post.category },
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.excerpt,
          datePublished: post.dateISO,
          author: { '@type': 'Organization', name: 'HyperCubeSphere' },
          publisher: { '@type': 'Organization', name: 'HyperCubeSphere' },
        },
      }),
    }
  },
})

function BlogPostPage() {
  const { locale, t } = useI18n()
  const { slug } = Route.useParams()
  const post = t.blog.posts.find((p) => p.slug === slug)

  if (!post) {
    return (
      <div className="px-6 md:px-12 py-20 text-center">
        <p className="font-mono text-xs text-accent uppercase tracking-[3px] mb-4">// 404</p>
        <h1 className="text-3xl font-extrabold uppercase tracking-wider mb-4">{t.notFound.title}</h1>
        <Link to="/$locale/blog" params={{ locale }} className="font-mono text-sm text-accent hover:underline">{t.blog.backToBlog}</Link>
      </div>
    )
  }

  const formattedDate = new Date(post.dateISO).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div>
      <section className="px-6 md:px-12 py-16 md:py-24 border-b-3 border-border-light dark:border-border-dark">
        <Link to="/$locale/blog" params={{ locale }} className="font-mono text-xs text-accent uppercase tracking-widest hover:underline mb-6 inline-block">{t.blog.backToBlog}</Link>
        <div className="flex items-center gap-4 mb-4">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent">// {post.category}</span>
          <span className="font-mono text-[11px] text-muted-light dark:text-muted-dark">{post.readTime}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight mb-4 max-w-3xl text-balance">{post.title}</h1>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark">{formattedDate}</p>
      </section>

      <section className="px-6 md:px-12 py-16 max-w-3xl">
        <div className="space-y-6">
          {post.content.split('\n\n').map((paragraph, i) => (
            <p key={i} className="font-mono text-[14px] leading-relaxed text-muted-light dark:text-muted-dark">{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-12 py-10 border-t-3 border-border-light dark:border-border-dark">
        <Link to="/$locale/blog" params={{ locale }} className="font-mono text-sm text-accent font-bold uppercase tracking-widest hover:underline">{t.blog.allPosts}</Link>
      </section>
    </div>
  )
}
