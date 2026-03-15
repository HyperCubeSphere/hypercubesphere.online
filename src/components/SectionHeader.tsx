interface SectionHeaderProps {
  eyebrow: string
  title: string
  count?: string
}

export default function SectionHeader({ eyebrow, title, count }: SectionHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b-3 border-border-light dark:border-border-dark pb-4">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[3px] text-accent mb-2">
          {eyebrow}
        </p>
        <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider">
          {title}
        </h2>
      </div>
      {count && (
        <span className="font-mono text-sm text-accent mt-2 md:mt-0">
          {count}
        </span>
      )}
    </div>
  )
}
