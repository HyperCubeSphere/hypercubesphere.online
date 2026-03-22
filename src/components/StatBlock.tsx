interface StatBlockProps {
  value: string
  label: string
}

export default function StatBlock({ value, label }: StatBlockProps) {
  return (
    <div className="border-3 border-border-light dark:border-border-dark -m-[1.5px] px-5 py-4 flex items-baseline gap-3">
      <span className="font-mono text-2xl md:text-3xl font-extrabold text-accent tabular-nums leading-none">
        {value}
      </span>
      <span className="font-mono text-[11px] uppercase tracking-widest font-semibold text-muted-light dark:text-muted-dark">
        {label}
      </span>
    </div>
  )
}
