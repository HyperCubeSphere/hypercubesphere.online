import { useState, useEffect } from 'react'
import { useI18n } from '../i18n'

export default function ThemeToggle() {
  const { t } = useI18n()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'dark' | 'light' | null
    const initial = stored === 'light' ? 'light' : 'dark'
    setTheme(initial)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(next)
    root.style.colorScheme = next
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', next === 'dark' ? '#08080c' : '#fffef5')
  }

  return (
    <button
      onClick={toggle}
      className="font-mono text-xs uppercase tracking-wider border-2 border-current px-3 py-2.5 min-h-[44px] transition-[border-color,color] duration-200 hover:border-accent hover:text-accent cursor-pointer touch-manipulation"
      aria-label={t.theme.toggleLabel}
    >
      {theme === 'dark' ? t.theme.light : t.theme.dark}
    </button>
  )
}
