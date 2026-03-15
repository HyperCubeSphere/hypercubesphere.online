interface StatBlockProps {
  value: string
  label: string
  variant?: 'default' | 'accent' | 'dark' | 'teal'
}

const variants = {
  default: 'border-border-light dark:border-border-dark',
  accent: 'bg-accent text-white border-accent',
  dark: 'bg-[#f0f0e8] dark:bg-[#0f0f18] border-accent/40 dark:border-accent',
  teal: 'bg-accent/5 dark:bg-teal-tint border-accent/20',
}

export default function StatBlock({ value, label, variant = 'default' }: StatBlockProps) {
  return (
    <div className={`border-3 p-6 glow-accent ${variants[variant]}`}>
      <p className="font-mono text-3xl md:text-4xl font-extrabold">
        {value}
      </p>
      <p className="font-mono text-[11px] uppercase tracking-widest mt-1 font-semibold opacity-70">
        {label}
      </p>
    </div>
  )
}
