import { createContext, useContext } from 'react'
import type en from './locales/en'

export type Translation = typeof en
export { locales, defaultLocale, localeNames, blogSlugs } from './config'
export type { Locale } from './config'

interface I18nContextValue {
  locale: string
  t: Translation
}

const I18nContext = createContext<I18nContextValue | null>(null)

export const I18nProvider = I18nContext.Provider

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

export function useTranslation() {
  return useI18n().t
}

export function useLocale() {
  return useI18n().locale
}
