interface TeamCardProps {
  name: string
  role: string
  bio: string
  initials: string
  color?: string
}

export default function TeamCard({ name, role, bio, initials, color = 'bg-accent' }: TeamCardProps) {
  return (
    <div className="border-3 border-border-light dark:border-border-dark p-8 glow-accent transition-[border-color,box-shadow] duration-200 hover:border-accent group">
      <div className={`w-28 h-28 ${color} flex items-center justify-center mb-6`}>
        <span className="font-mono text-3xl font-extrabold text-white">
          {initials}
        </span>
      </div>
      <h3 className="text-lg font-bold uppercase tracking-wider mb-1 group-hover:text-accent transition-[color] duration-200">
        {name}
      </h3>
      <p className="font-mono text-xs text-accent font-semibold uppercase tracking-wider mb-4">
        // {role}
      </p>
      <p className="font-mono text-[13px] text-muted-light dark:text-muted-dark leading-relaxed">
        {bio}
      </p>
    </div>
  )
}
