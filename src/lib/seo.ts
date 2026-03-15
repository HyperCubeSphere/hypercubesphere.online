const SITE_URL = 'https://hypercubesphere.online'
const SITE_NAME = 'HyperCubeSphere'

interface SeoConfig {
  title: string
  description: string
  path: string
  type?: 'website' | 'article'
  article?: {
    publishedTime: string
    section: string
  }
  jsonLd?: Record<string, unknown>
}

export function seo(config: SeoConfig) {
  const { title, description, path, type = 'website', article, jsonLd } = config
  const url = `${SITE_URL}${path}`

  const meta: Array<Record<string, string>> = [
    { title },
    { name: 'description', content: description },
    { property: 'og:type', content: type },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:locale', content: 'en_US' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ]

  if (article) {
    meta.push(
      { property: 'article:published_time', content: article.publishedTime },
      { property: 'article:section', content: article.section },
    )
  }

  const links = [{ rel: 'canonical', href: url }]

  const result: {
    meta: typeof meta
    links: typeof links
    scripts?: Array<{ type: string; children: string }>
  } = { meta, links }

  if (jsonLd) {
    result.scripts = [
      { type: 'application/ld+json', children: JSON.stringify(jsonLd) },
    ]
  }

  return result
}
