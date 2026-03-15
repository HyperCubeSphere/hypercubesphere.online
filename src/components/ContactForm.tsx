import { useState, useRef, useEffect } from 'react'

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
  const ref = useRef<HTMLDivElement>(null)
  const selected = subjects.find((s) => s.value === value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full border-3 ${open ? 'border-accent' : 'border-border-light dark:border-border-dark'} bg-transparent px-4 py-3 font-mono text-sm uppercase tracking-wider text-left transition-colors cursor-pointer flex items-center justify-between`}
      >
        <span className={selected ? '' : 'text-muted-light dark:text-muted-dark'}>
          {selected ? selected.label : 'SELECT SUBJECT'}
        </span>
        <span className="text-accent text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 border-3 border-accent border-t-0 bg-bg-light dark:bg-bg-dark z-50 max-h-60 overflow-auto">
          {subjects.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => { onChange(s.value); setOpen(false) }}
              className={`w-full px-4 py-3 font-mono text-sm uppercase tracking-wider text-left transition-colors cursor-pointer hover:bg-accent hover:text-white ${value === s.value ? 'text-accent' : 'text-muted-light dark:text-muted-dark'}`}
            >
              // {s.label}
            </button>
          ))}
        </div>
      )}
      {/* Hidden input for form submission */}
      <input type="hidden" name="subject" value={value} />
    </div>
  )
}

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [subject, setSubject] = useState('')

  if (submitted) {
    return (
      <div className="border-3 border-accent p-10 text-center">
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
        <input
          type="text"
          name="name"
          placeholder="NAME"
          required
          className="w-full border-3 border-border-light dark:border-border-dark bg-transparent px-4 py-3 font-mono text-sm uppercase tracking-wider placeholder:text-muted-light dark:placeholder:text-muted-dark focus:border-accent focus:outline-none transition-colors"
        />
        <input
          type="email"
          name="email"
          placeholder="EMAIL"
          required
          className="w-full border-3 border-border-light dark:border-border-dark bg-transparent px-4 py-3 font-mono text-sm uppercase tracking-wider placeholder:text-muted-light dark:placeholder:text-muted-dark focus:border-accent focus:outline-none transition-colors"
        />
      </div>
      <input
        type="text"
        name="company"
        placeholder="COMPANY"
        className="w-full border-3 border-border-light dark:border-border-dark bg-transparent px-4 py-3 font-mono text-sm uppercase tracking-wider placeholder:text-muted-light dark:placeholder:text-muted-dark focus:border-accent focus:outline-none transition-colors"
      />
      <CustomSelect value={subject} onChange={setSubject} />
      <textarea
        name="message"
        placeholder="YOUR MESSAGE"
        rows={5}
        required
        className="w-full border-3 border-border-light dark:border-border-dark bg-transparent px-4 py-3 font-mono text-sm uppercase tracking-wider placeholder:text-muted-light dark:placeholder:text-muted-dark focus:border-accent focus:outline-none transition-colors resize-none"
      />
      <button
        type="submit"
        className="w-full md:w-auto bg-accent text-white border-3 border-accent px-8 py-3 font-mono text-sm font-extrabold uppercase tracking-widest glow-accent transition-colors hover:bg-transparent hover:text-accent cursor-pointer"
      >
        Send Message →
      </button>
    </form>
  )
}
