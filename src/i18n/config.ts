export const locales = ['en', 'ro', 'de', 'fr', 'el', 'uk', 'es', 'tr', 'et', 'cs', 'nl', 'sv', 'it', 'da'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ro: 'Română',
  de: 'Deutsch',
  fr: 'Français',
  el: 'Ελληνικά',
  uk: 'Українська',
  es: 'Español',
  tr: 'Türkçe',
  et: 'Eesti',
  cs: 'Čeština',
  nl: 'Nederlands',
  sv: 'Svenska',
  it: 'Italiano',
  da: 'Dansk',
}

export const blogSlugs = [
  'future-of-ai-driven-security-operations',
  'zero-trust-architecture-practical-guide',
  'building-scalable-data-pipelines',
  'strategic-software-architecture-startups',
  'cloud-cost-optimization-lessons',
  'every-enterprise-needs-ai-strategy',
] as const
