import { useState, useRef, useEffect, useCallback } from 'react'
import { useI18n } from '../i18n'

function CustomSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n()
  const subjects = t.contact.form.subjects
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const selected = subjects.find((s) => s.value === value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open) setFocusedIndex(value ? subjects.findIndex((s) => s.value === value) : 0)
  }, [open, value, subjects])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (open && focusedIndex >= 0) { onChange(subjects[focusedIndex].value); setOpen(false) }
        else setOpen(true)
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!open) setOpen(true)
        else setFocusedIndex((i) => Math.min(i + 1, subjects.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (open) setFocusedIndex((i) => Math.max(i - 1, 0))
        break
      case 'Escape':
        setOpen(false)
        break
    }
  }, [open, focusedIndex, onChange, subjects])

  return (
    <div ref={ref} className="relative">
      <label htmlFor="subject-select" className="block font-mono text-[11px] font-bold uppercase tracking-widest text-accent mb-2">// {t.contact.form.subjectLabel}</label>
      <button
        id="subject-select"
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="subject-listbox"
        aria-activedescendant={open && focusedIndex >= 0 ? `subject-option-${focusedIndex}` : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        className={`w-full border-3 ${open ? 'border-accent' : 'border-border-light dark:border-border-dark'} bg-transparent px-4 py-3 min-h-[44px] font-mono text-sm uppercase tracking-wider text-left transition-[border-color] duration-200 cursor-pointer flex items-center justify-between`}
      >
        <span className={selected ? '' : 'text-muted-light dark:text-muted-dark'}>
          {selected ? selected.label : t.contact.form.subjectPlaceholder}
        </span>
        <span className="text-accent text-xs" aria-hidden="true">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div id="subject-listbox" role="listbox" aria-label={t.contact.form.subjectLabel} className="absolute top-full left-0 right-0 border-3 border-accent border-t-0 bg-bg-light dark:bg-bg-dark z-50 max-h-60 overflow-auto">
          {subjects.map((s, i) => (
            <button
              key={s.value}
              id={`subject-option-${i}`}
              type="button"
              role="option"
              aria-selected={value === s.value}
              onClick={() => { onChange(s.value); setOpen(false) }}
              className={`w-full px-4 py-3 min-h-[44px] font-mono text-sm uppercase tracking-wider text-left transition-[background-color,color] duration-150 cursor-pointer hover:bg-accent hover:text-white ${i === focusedIndex ? 'bg-accent text-white' : value === s.value ? 'text-accent' : 'text-muted-light dark:text-muted-dark'}`}
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
  const { t } = useI18n()
  const f = t.contact.form
  const [submitted, setSubmitted] = useState(false)
  const [subject, setSubject] = useState('')

  if (submitted) {
    return (
      <div className="border-3 border-accent p-10 text-center" role="status" aria-live="polite">
        <p className="font-mono text-xs text-accent uppercase tracking-[3px] mb-3">{t.contact.success.eyebrow}</p>
        <h3 className="text-2xl font-extrabold uppercase tracking-wider mb-4">{t.contact.success.title}</h3>
        <p className="text-sm text-muted-light dark:text-muted-dark">{t.contact.success.message}</p>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="block font-mono text-[11px] font-bold uppercase tracking-widest text-accent mb-2">// {f.nameLabel}</label>
          <input id="contact-name" type="text" name="name" autoComplete="name" placeholder={f.namePlaceholder} required className="w-full border-3 border-border-light dark:border-border-dark bg-transparent px-4 py-3 min-h-[44px] font-mono text-sm uppercase tracking-wider placeholder:text-muted-light dark:placeholder:text-muted-dark focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-[border-color] duration-200" />
        </div>
        <div>
          <label htmlFor="contact-email" className="block font-mono text-[11px] font-bold uppercase tracking-widest text-accent mb-2">// {f.emailLabel}</label>
          <input id="contact-email" type="email" name="email" autoComplete="email" spellCheck={false} placeholder={f.emailPlaceholder} required className="w-full border-3 border-border-light dark:border-border-dark bg-transparent px-4 py-3 min-h-[44px] font-mono text-sm uppercase tracking-wider placeholder:text-muted-light dark:placeholder:text-muted-dark focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-[border-color] duration-200" />
        </div>
      </div>
      <div>
        <label htmlFor="contact-company" className="block font-mono text-[11px] font-bold uppercase tracking-widest text-accent mb-2">// {f.companyLabel}</label>
        <input id="contact-company" type="text" name="company" autoComplete="organization" placeholder={f.companyPlaceholder} className="w-full border-3 border-border-light dark:border-border-dark bg-transparent px-4 py-3 min-h-[44px] font-mono text-sm uppercase tracking-wider placeholder:text-muted-light dark:placeholder:text-muted-dark focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-[border-color] duration-200" />
      </div>
      <CustomSelect value={subject} onChange={setSubject} />
      <div>
        <label htmlFor="contact-message" className="block font-mono text-[11px] font-bold uppercase tracking-widest text-accent mb-2">// {f.messageLabel}</label>
        <textarea id="contact-message" name="message" placeholder={f.messagePlaceholder} rows={5} required className="w-full border-3 border-border-light dark:border-border-dark bg-transparent px-4 py-3 min-h-[44px] font-mono text-sm uppercase tracking-wider placeholder:text-muted-light dark:placeholder:text-muted-dark focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-[border-color] duration-200 resize-none" />
      </div>
      <button type="submit" className="w-full md:w-auto bg-accent text-white border-3 border-accent px-8 py-3 min-h-[44px] font-mono text-sm font-extrabold uppercase tracking-widest glow-accent transition-[background-color,color] duration-200 hover:bg-transparent hover:text-accent cursor-pointer touch-manipulation">{f.submit}</button>
    </form>
  )
}
