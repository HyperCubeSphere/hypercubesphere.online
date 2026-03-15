interface ServiceCardProps {
  number: string
  title: string
  description: string
}

export default function ServiceCard({ number, title, description }: ServiceCardProps) {
  return (
    <div className="border-3 border-border-light dark:border-border-dark p-8 -m-[1.5px] relative z-0 cursor-default group transition-[border-color,background-color,transform,box-shadow] duration-200 hover:z-10 hover:border-accent hover:bg-hover-light dark:hover:bg-hover-dark hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0_var(--color-accent)]">
      <p className="font-mono text-xs font-bold text-accent mb-4 tracking-wider">
        // {number}
      </p>
      <h3 className="text-base font-bold uppercase tracking-wider mb-3 group-hover:text-accent transition-[color] duration-200">
        {title}
      </h3>
      <p className="font-mono text-[13px] text-muted-light dark:text-muted-dark leading-relaxed">
        {description}
      </p>
    </div>
  )
}
