import { useRouterState } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { locales, localeNames, type Locale } from '../i18n'
import { useI18n } from '../i18n'
import FlagIcon from './FlagIcon'

export default function LanguageSwitcher() {
  const { locale } = useI18n()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const currentPath = pathname.replace(new RegExp(`^/${locale}`), '') || '/'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider border-2 border-current px-2.5 py-2.5 min-h-[44px] transition-[border-color,color] duration-200 hover:border-accent hover:text-accent cursor-pointer touch-manipulation"
        aria-label={`${locale.toUpperCase()} — Switch language`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <FlagIcon locale={locale as Locale} className="w-4 h-auto" />
        <span>{locale.toUpperCase()}</span>
        <span className="text-[10px]" aria-hidden="true">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Language"
          className="absolute right-0 top-full mt-1 border-3 border-accent bg-bg-light dark:bg-bg-dark z-[60] min-w-[180px] max-h-[320px] overflow-auto"
        >
          {locales.map((l) => (
            <a
              key={l}
              href={`/${l}${currentPath === '/' ? '' : currentPath}`}
              role="option"
              aria-selected={l === locale}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] font-mono text-[12px] uppercase tracking-wider transition-[background-color,color] duration-150 cursor-pointer hover:bg-accent hover:text-white ${l === locale ? 'text-accent font-bold' : 'text-muted-light dark:text-muted-dark'}`}
            >
              <FlagIcon locale={l} className="w-4 h-auto shrink-0" />
              <span>{localeNames[l]}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
