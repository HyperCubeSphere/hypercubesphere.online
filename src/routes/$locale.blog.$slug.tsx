import { createFileRoute, Link } from '@tanstack/react-router'
import { useI18n } from '../i18n'
import { seo } from '../lib/seo'
import { getTranslation } from '../i18n/translations'
import { getBlogMarkdown } from '../lib/blog'
import { parseMarkdown } from '../lib/markdown'

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
        extraMeta: [
          { name: 'author', content: 'HyperCubeSphere' },
          { property: 'article:author', content: 'https://hypercubesphere.online' },
        ],
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.excerpt,
          datePublished: post.dateISO,
          dateModified: post.dateISO,
          articleSection: post.category,
          author: {
            '@type': 'Organization',
            name: 'HyperCubeSphere',
            url: 'https://hypercubesphere.online',
          },
          publisher: {
            '@type': 'Organization',
            name: 'HyperCubeSphere',
            url: 'https://hypercubesphere.online',
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://hypercubesphere.online/${params.locale}/blog/${post.slug}`,
          },
        },
      }),
    }
  },
  loader: async ({ params }) => {
    const markdown = getBlogMarkdown(params.slug, params.locale)
    if (markdown) {
      const html = await parseMarkdown(markdown)
      return { html }
    }
    return { html: null }
  },
})

function BlogPostPage() {
  const { locale, t } = useI18n()
  const { slug } = Route.useParams()
  const { html } = Route.useLoaderData()
  const post = t.blog.posts.find((p) => p.slug === slug)

  if (!post) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20 text-center">
        <p className="font-mono text-xs text-accent uppercase tracking-[3px] mb-4">// 404</p>
        <h1 className="text-3xl font-extrabold uppercase tracking-wider mb-4">{t.notFound.title}</h1>
        <Link to="/$locale/blog" params={{ locale }} className="font-mono text-sm text-accent hover:underline">{t.blog.backToBlog}</Link>
      </div>
    )
  }

  const formattedDate = new Date(post.dateISO).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <article>
      <header className="border-b-3 border-border-light dark:border-border-dark">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-16 md:py-24">
          <Link to="/$locale/blog" params={{ locale }} className="font-mono text-xs text-accent uppercase tracking-widest hover:underline mb-6 inline-block">{t.blog.backToBlog}</Link>
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent">// {post.category}</span>
            <span className="font-mono text-[11px] text-muted-light dark:text-muted-dark">{post.readTime}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight mb-4 max-w-3xl text-balance">{post.title}</h1>
          <time dateTime={post.dateISO} className="font-mono text-sm text-muted-light dark:text-muted-dark">{formattedDate}</time>
        </div>
      </header>

      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {html ? (
            <div className="prose max-w-3xl" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div className="max-w-3xl space-y-6">
              {post.content.split('\n\n').map((paragraph, i) => (
                <p key={i} className="text-[15px] leading-7 text-muted-light dark:text-muted-dark">{paragraph}</p>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t-3 border-border-light dark:border-border-dark">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
          <Link to="/$locale/blog" params={{ locale }} className="font-mono text-sm text-accent font-bold uppercase tracking-widest hover:underline">{t.blog.allPosts}</Link>
        </div>
      </footer>
    </article>
  )
}
