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
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', next === 'dark' ? '#08080c' : '#fffef5')
  }

  return (
    <button
      onClick={toggle}
      className="font-mono text-xs uppercase tracking-wider border-2 border-current px-3 py-1.5 transition-[border-color,color] duration-200 hover:border-accent hover:text-accent cursor-pointer touch-manipulation"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '// LIGHT' : '// DARK'}
    </button>
  )
}
