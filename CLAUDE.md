# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**hypercubesphere.online** — B2B technology consulting agency website. Security-first, engineer-led firm offering AI, cybersecurity, cloud, data, and strategic advisory services to enterprises.

## Repository

- **Remote**: git@github.com:HyperCubeSphere/hypercubesphere.online.git
- **IDE**: WebStorm
- **Stack**: TanStack Start (React 19) + Tailwind CSS v4 + TypeScript + Vite
- **Dev**: `npm run dev` (port 3000) · `npm run build` · `npm run preview`
- **Hosting**: GitHub Pages (static prerendering, deployed via GitHub Actions on push to main)
- **Build output**: `dist/client/` contains all prerendered HTML + JS + CSS assets

## Design Context

### Users
Enterprise technology leaders — CTOs, VPs of Engineering, Digital Transformation heads at Fortune 500 and mid-market companies. They're evaluating consulting partners and need to quickly assess competence, credibility, and differentiation. They value substance over flash and have low tolerance for generic marketing.

### Brand Personality
**Sharp, Trusted, Inventive.** Cutting-edge thinking paired with engineering rigor and proven reliability. The brand speaks with authority but never arrogance — confident because the work speaks for itself.

**Emotional target (first 3 seconds):** *"These people are serious."* — Immediate competence, authority, and trust.

### Aesthetic Direction
**Neo-Brutalist + Dark Mode + Cyberpunk Accents** — chosen from 8 visual mockups.

- **Dark mode default** (`#08080c`) with light mode toggle (`#fffef5`)
- **Warm cyberpunk orange** (`#ff6b35`) as sole accent — CTAs, highlights, hovers, glows
- **Thick 3px borders**, no rounded corners, rectangular geometry throughout
- **Grid overlay texture** (80×80px, faint orange) for tactile depth
- **Space Grotesk** (display/body) + **JetBrains Mono** (technical/metadata)
- **Code-style `//` prefixes**, numbered sections, uppercase headings, wide tracking
- **Card hover:** shift up-left + hard orange shadow (neo-brutalist signature)
- **Stat blocks** with monospace numbers and glow-on-hover

**Anti-references (must NOT resemble):**
- Generic SaaS / Stripe clones (purple gradients, rounded cards, stock illustrations)
- Traditional consulting firms (corporate blue, stock photos, safe typography)
- Overdesigned agency sites (Awwwards-bait, excessive parallax, style over substance)

### Design Principles

1. **Engineering authenticity** — Every visual choice should feel like it was made by engineers, not marketers. Monospace type, code prefixes, numbered sections, and grid overlays reinforce technical credibility.

2. **Intentional brutality** — Thick borders, hard shadows, and stark contrast are deliberate. Nothing is softened to be "safe." Every edge is a statement.

3. **Restrained intensity** — The orange accent is powerful because it's the only color. Motion is sparse but impactful. Glow effects are earned, not sprinkled.

4. **Substance over spectacle** — No decoration without purpose. No animation without meaning. The design serves the content, which serves the user's decision.

5. **Accessible by conviction** — WCAG AAA target. Respect `prefers-reduced-motion`. High contrast is not just compliant — it's the aesthetic.
