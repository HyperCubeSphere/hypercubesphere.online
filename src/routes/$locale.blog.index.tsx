import { createFileRoute } from '@tanstack/react-router'
import BlogCard from '../components/BlogCard'
import { useI18n } from '../i18n'
import { seo } from '../lib/seo'
import { getTranslation } from '../i18n/translations'

export const Route = createFileRoute('/$locale/blog/')({
  component: BlogPage,
  head: ({ params }) => { const t = getTranslation(params.locale); return {
    ...seo({ title: t.blog.seoTitle, description: t.blog.seoDescription, path: '/blog', locale: params.locale }),
  }},
})

function BlogPage() {
  const { locale, t } = useI18n()
  const b = t.blog

  return (
    <div>
      <section className="px-6 md:px-12 py-16 md:py-24 border-b-3 border-border-light dark:border-border-dark">
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-4">{b.eyebrow}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-6 max-w-2xl text-balance">
          {b.headingPre}<span className="accent-highlight">{b.headingBold}</span>
        </h1>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark max-w-xl leading-relaxed">{b.subtitle}</p>
      </section>

      <section className="px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
          {b.posts.map((post) => (
            <div key={post.slug} className="-m-[1.5px]">
              <BlogCard
                slug={post.slug}
                title={post.title}
                date={new Date(post.dateISO).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
                excerpt={post.excerpt}
                category={post.category}
                readTime={post.readTime}
                locale={locale}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
