interface SocialLink {
  type: 'linkedin' | 'github' | 'website'
  url: string
}

interface TeamCardProps {
  name: string
  role: string
  bio: string
  initials: string
  color?: string
  image?: string
  socials?: SocialLink[]
}

const socialIcons: Record<SocialLink['type'], { label: string; icon: React.ReactNode }> = {
  linkedin: {
    label: '/LI',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <rect x="2" y="2" width="4" height="4" />
      </svg>
    ),
  },
  github: {
    label: '/GH',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
      </svg>
    ),
  },
  website: {
    label: '/WEB',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
}

export default function TeamCard({ name, role, bio, initials, color = 'bg-accent', image, socials }: TeamCardProps) {
  return (
    <div className="h-full border-3 border-border-light dark:border-border-dark p-8 glow-accent transition-[border-color,box-shadow] duration-200 hover:border-accent group flex flex-col">
      {image ? (
        <img src={image} alt={name} width={112} height={112} className="w-28 h-28 object-cover border-3 border-border-light dark:border-border-dark mb-6" />
      ) : (
        <div className={`w-28 h-28 ${color} flex items-center justify-center mb-6`}>
          <span className="font-mono text-3xl font-extrabold text-white">
            {initials}
          </span>
        </div>
      )}
      <h3 className="text-lg font-bold uppercase tracking-wider mb-1 group-hover:text-accent transition-[color] duration-200">
        {name}
      </h3>
      <p className="font-mono text-xs text-accent font-semibold uppercase tracking-wider mb-4">
        // {role}
      </p>
      <p className="text-[13px] text-muted-light dark:text-muted-dark leading-relaxed mb-6 flex-1">
        {bio}
      </p>
      {socials && socials.length > 0 && (
        <div className="flex gap-4 border-t-3 border-border-light dark:border-border-dark pt-4">
          {socials.map((s) => (
            <a
              key={s.type}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-light dark:text-muted-dark hover:text-accent transition-[color] duration-200"
              aria-label={`${name} on ${s.type}`}
            >
              {socialIcons[s.type].icon}
              <span>{socialIcons[s.type].label}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
