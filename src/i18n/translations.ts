import type { Translation } from './index'

const modules = import.meta.glob('./locales/*.ts', { eager: true }) as Record<string, { default: Translation }>

const translations: Record<string, Translation> = {}
for (const [path, mod] of Object.entries(modules)) {
  const locale = path.match(/\.\/locales\/(.+)\.ts/)?.[1]
  if (locale) translations[locale] = mod.default
}

export function getTranslation(locale: string): Translation {
  return translations[locale] ?? translations.en
}
