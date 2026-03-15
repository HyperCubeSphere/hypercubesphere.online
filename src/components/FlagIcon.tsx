import type { Locale } from '../i18n'

interface FlagIconProps {
  locale: Locale
  className?: string
}

export default function FlagIcon({ locale, className = 'w-5 h-auto' }: FlagIconProps) {
  return (
    <svg viewBox="0 0 20 15" className={className} aria-hidden="true">
      {flags[locale]}
    </svg>
  )
}

const flags: Record<Locale, React.ReactNode> = {
  en: (
    <>
      <rect width="20" height="15" fill="#012169" />
      <path d="M0,0 L20,15 M20,0 L0,15" stroke="#fff" strokeWidth="3" />
      <path d="M0,0 L20,15 M20,0 L0,15" stroke="#C8102E" strokeWidth="1.5" />
      <path d="M10,0 V15 M0,7.5 H20" stroke="#fff" strokeWidth="5" />
      <path d="M10,0 V15 M0,7.5 H20" stroke="#C8102E" strokeWidth="3" />
    </>
  ),
  ro: (
    <>
      <rect x="0" width="6.67" height="15" fill="#002B7F" />
      <rect x="6.67" width="6.67" height="15" fill="#FCD116" />
      <rect x="13.33" width="6.67" height="15" fill="#CE1126" />
    </>
  ),
  de: (
    <>
      <rect width="20" height="5" fill="#000" />
      <rect y="5" width="20" height="5" fill="#DD0000" />
      <rect y="10" width="20" height="5" fill="#FFCE00" />
    </>
  ),
  fr: (
    <>
      <rect x="0" width="6.67" height="15" fill="#002395" />
      <rect x="6.67" width="6.67" height="15" fill="#fff" />
      <rect x="13.33" width="6.67" height="15" fill="#ED2939" />
    </>
  ),
  el: (
    <>
      <rect width="20" height="15" fill="#0D5EAF" />
      {[0, 2, 4, 6, 8].map(i => (
        <rect key={i} y={i * (15 / 9)} width="20" height={15 / 9} fill={i % 4 === 0 ? '#0D5EAF' : '#fff'} />
      ))}
      <rect width="7.4" height="6.67" fill="#0D5EAF" />
      <rect x="2.96" width="1.48" height="6.67" fill="#fff" />
      <rect y="2.59" width="7.4" height="1.48" fill="#fff" />
    </>
  ),
  uk: (
    <>
      <rect width="20" height="7.5" fill="#005BBB" />
      <rect y="7.5" width="20" height="7.5" fill="#FFD500" />
    </>
  ),
  es: (
    <>
      <rect width="20" height="15" fill="#AA151B" />
      <rect y="3.75" width="20" height="7.5" fill="#F1BF00" />
    </>
  ),
  tr: (
    <>
      <rect width="20" height="15" fill="#E30A17" />
      <circle cx="7.5" cy="7.5" r="3.75" fill="#fff" />
      <circle cx="8.5" cy="7.5" r="3" fill="#E30A17" />
      <polygon points="11.5,7.5 12.8,6.2 12,7.8 13.5,7 11.8,7.3" fill="#fff" transform="rotate(18 12 7.5)" />
    </>
  ),
  et: (
    <>
      <rect width="20" height="5" fill="#0072CE" />
      <rect y="5" width="20" height="5" fill="#000" />
      <rect y="10" width="20" height="5" fill="#fff" />
    </>
  ),
  cs: (
    <>
      <rect width="20" height="7.5" fill="#fff" />
      <rect y="7.5" width="20" height="7.5" fill="#D7141A" />
      <polygon points="0,0 10,7.5 0,15" fill="#11457E" />
    </>
  ),
  nl: (
    <>
      <rect width="20" height="5" fill="#AE1C28" />
      <rect y="5" width="20" height="5" fill="#fff" />
      <rect y="10" width="20" height="5" fill="#21468B" />
    </>
  ),
  sv: (
    <>
      <rect width="20" height="15" fill="#006AA7" />
      <rect x="6" width="2.5" height="15" fill="#FECC00" />
      <rect y="5.63" width="20" height="2.75" fill="#FECC00" />
    </>
  ),
  it: (
    <>
      <rect x="0" width="6.67" height="15" fill="#009246" />
      <rect x="6.67" width="6.67" height="15" fill="#fff" />
      <rect x="13.33" width="6.67" height="15" fill="#CE2B37" />
    </>
  ),
  da: (
    <>
      <rect width="20" height="15" fill="#C8102E" />
      <rect x="5.5" width="2.5" height="15" fill="#fff" />
      <rect y="5.63" width="20" height="2.75" fill="#fff" />
    </>
  ),
}
