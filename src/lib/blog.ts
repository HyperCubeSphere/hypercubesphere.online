const modules = import.meta.glob('../content/blog/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const blogContent: Record<string, Record<string, string>> = {}
for (const [path, content] of Object.entries(modules)) {
  const match = path.match(/\.\.\/content\/blog\/([^/]+)\/(.+)\.md/)
  if (match) {
    const [, locale, slug] = match
    blogContent[locale] ??= {}
    blogContent[locale][slug] = content
  }
}

export function getBlogMarkdown(slug: string, locale: string): string | undefined {
  return blogContent[locale]?.[slug] ?? blogContent['en']?.[slug]
}
