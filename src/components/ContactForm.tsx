import { useState, useRef, useEffect, useCallback } from 'react'

const subjects = [
  { value: 'ai', label: 'AI Engineering' },
  { value: 'software', label: 'Software Strategy' },
  { value: 'security', label: 'Cybersecurity' },
  { value: 'cloud', label: 'Cloud Architecture' },
  { value: 'consulting', label: 'Strategic Consulting' },
  { value: 'other', label: 'Other' },
]

function CustomSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const selected = subjects.find((s) => s.value === value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open) {
      setFocusedIndex(value ? subjects.findIndex((s) => s.value === value) : 0)
    }
  }, [open, value])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (open && focusedIndex >= 0) {
          onChange(subjects[focusedIndex].value)
          setOpen(false)
        } else {
          setOpen(true)
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!open) {
          setOpen(true)
        } else {
          setFocusedIndex((i) => Math.min(i + 1, subjects.length - 1))
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (open) {
          setFocusedIndex((i) => Math.max(i - 1, 0))
        }
        break
      case 'Escape':
        setOpen(false)
        break
    }
  }, [open, focusedIndex, onChange])

  const activeDescendant = open && focusedIndex >= 0 ? `subject-option-${focusedIndex}` : undefined

  return (
    <div ref={ref} className="relative">
      <label htmlFor="subject-select" className="sr-only">Subject</label>
      <button
        id="subject-select"
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="subject-listbox"
        aria-activedescendant={activeDescendant}
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        className={`w-full border-3 ${open ? 'border-accent' : 'border-border-light dark:border-border-dark'} bg-transparent px-4 py-3 font-mono text-sm uppercase tracking-wider text-left transition-[border-color] duration-200 cursor-pointer flex items-center justify-between`}
      >
        <span className={selected ? '' : 'text-muted-light dark:text-muted-dark'}>
          {selected ? selected.label : 'SELECT SUBJECT\u2026'}
        </span>
        <span className="text-accent text-xs" aria-hidden="true">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div
          ref={listRef}
          id="subject-listbox"
          role="listbox"
          aria-label="Subject"
          className="absolute top-full left-0 right-0 border-3 border-accent border-t-0 bg-bg-light dark:bg-bg-dark z-50 max-h-60 overflow-auto"
        >
          {subjects.map((s, i) => (
            <button
              key={s.value}
              id={`subject-option-${i}`}
              type="button"
              role="option"
              aria-selected={value === s.value}
              onClick={() => { onChange(s.value); setOpen(false) }}
              className={`w-full px-4 py-3 font-mono text-sm uppercase tracking-wider text-left transition-[background-color,color] duration-150 cursor-pointer hover:bg-accent hover:text-white ${i === focusedIndex ? 'bg-accent text-white' : value === s.value ? 'text-accent' : 'text-muted-light dark:text-muted-dark'}`}
            >
              // {s.label}
            </button>
          ))}
        </div>
      )}
      <input type="hidden" name="subject" value={value} />
    </div>
  )
}

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [subject, setSubject] = useState('')

  if (submitted) {
    return (
      <div className="border-3 border-accent p-10 text-center" role="status" aria-live="polite">
        <p className="font-mono text-xs text-accent uppercase tracking-[3px] mb-3">
          // Message Sent
        </p>
        <h3 className="text-2xl font-extrabold uppercase tracking-wider mb-4">
          Thank You
        </h3>
        <p className="font-mono text-sm text-muted-light dark:text-muted-dark">
          We'll get back to you within 24 hours.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setSubmitted(true)
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="sr-only">Name</label>
          <input
            id="contact-name"
            type="text"
            name="name"
            autoComplete="name"
            placeholder="NAME\u2026"
            required
            className="w-full border-3 border-border-light dark:border-border-dark bg-transparent px-4 py-3 font-mono text-sm uppercase tracking-wider placeholder:text-muted-light dark:placeholder:text-muted-dark focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-[border-color] duration-200"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="sr-only">Email</label>
          <input
            id="contact-email"
            type="email"
            name="email"
            autoComplete="email"
            spellCheck={false}
            placeholder="EMAIL\u2026"
            required
            className="w-full border-3 border-border-light dark:border-border-dark bg-transparent px-4 py-3 font-mono text-sm uppercase tracking-wider placeholder:text-muted-light dark:placeholder:text-muted-dark focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-[border-color] duration-200"
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-company" className="sr-only">Company</label>
        <input
          id="contact-company"
          type="text"
          name="company"
          autoComplete="organization"
          placeholder="COMPANY\u2026"
          className="w-full border-3 border-border-light dark:border-border-dark bg-transparent px-4 py-3 font-mono text-sm uppercase tracking-wider placeholder:text-muted-light dark:placeholder:text-muted-dark focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-[border-color] duration-200"
        />
      </div>
      <CustomSelect value={subject} onChange={setSubject} />
      <div>
        <label htmlFor="contact-message" className="sr-only">Message</label>
        <textarea
          id="contact-message"
          name="message"
          placeholder="YOUR MESSAGE\u2026"
          rows={5}
          required
          className="w-full border-3 border-border-light dark:border-border-dark bg-transparent px-4 py-3 font-mono text-sm uppercase tracking-wider placeholder:text-muted-light dark:placeholder:text-muted-dark focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-[border-color] duration-200 resize-none"
        />
      </div>
      <button
        type="submit"
        className="w-full md:w-auto bg-accent text-white border-3 border-accent px-8 py-3 font-mono text-sm font-extrabold uppercase tracking-widest glow-accent transition-[background-color,color] duration-200 hover:bg-transparent hover:text-accent cursor-pointer touch-manipulation"
      >
        Send Message →
      </button>
    </form>
  )
}
