import { locales } from '../i18n/config'

const SITE_URL = 'https://hypercubesphere.online'
const SITE_NAME = 'HyperCubeSphere'

interface SeoConfig {
  title: string
  description: string
  path: string
  locale?: string
  type?: 'website' | 'article'
  article?: {
    publishedTime: string
    section: string
  }
  extraMeta?: Array<Record<string, string>>
  jsonLd?: Record<string, unknown>
}

export function seo(config: SeoConfig) {
  const { title, description, path, locale = 'en', type = 'website', article, extraMeta, jsonLd } = config
  const url = `${SITE_URL}/${locale}${path}`

  const meta: Array<Record<string, string>> = [
    { title },
    { name: 'description', content: description },
    { property: 'og:type', content: type },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:locale', content: locale },
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

  if (extraMeta) {
    meta.push(...extraMeta)
  }

  const links: Array<Record<string, string>> = [
    { rel: 'canonical', href: url },
    ...locales.map((l) => ({
      rel: 'alternate',
      hreflang: l,
      href: `${SITE_URL}/${l}${path}`,
    })),
    { rel: 'alternate', hreflang: 'x-default', href: `${SITE_URL}/en${path}` },
  ]

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
