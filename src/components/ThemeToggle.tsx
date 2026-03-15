import { useState, useEffect } from 'react'

export default function ThemeToggle() {
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
  }

  return (
    <button
      onClick={toggle}
      className="font-mono text-xs uppercase tracking-wider border-2 border-current px-3 py-1.5 transition-colors hover:border-accent hover:text-accent cursor-pointer"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '// LIGHT' : '// DARK'}
    </button>
  )
}
