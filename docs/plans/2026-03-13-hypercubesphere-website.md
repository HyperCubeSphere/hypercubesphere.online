# HyperCubeSphere Website Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a presentation website for HyperCubeSphere using TanStack Start + Tailwind CSS v4 with a Neo-Brutalist design featuring dark mode and cyberpunk accents.

**Architecture:** TanStack Start (Vite-based SSR) with file-based routing. All pages are server-rendered React components. Tailwind v4 handles styling with a custom theme. Dark/light mode via CSS class strategy with a toggle. Contact form uses a TanStack server function.

**Tech Stack:** TanStack Start (React), TanStack Router (file-based), Tailwind CSS v4, TypeScript, Vite

---

## Design System Reference

- **Fonts:** JetBrains Mono (mono), Space Grotesk (sans)
- **Dark mode colors:** bg `#08080c`, text `#e0e0e8`, accent `#ff6b35`, borders `#1a1a25`, muted `#555`
- **Light mode colors:** bg `#fffef5`, text `#1a1a1a`, accent `#ff6b35`, borders `#1a1a1a`, muted `#666`
- **Patterns:** 3px borders, uppercase headings, `//` prefixes, numbered sections, stat blocks, grid overlay, glow on accent hover, shift+box-shadow on card hover

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `src/router.tsx`
- Create: `src/server.tsx`
- Create: `src/styles.css`
- Create: `src/routes/__root.tsx`
- Create: `src/routes/index.tsx`

**Step 1: Initialize project and install dependencies**

```bash
cd /Users/vortex/WebstormProjectsPersonal/hypercubesphere.online
npm init -y
npm install react react-dom @tanstack/react-start @tanstack/react-router
npm install --save-dev typescript @types/react @types/react-dom vite vite-tsconfig-paths tailwindcss @tailwindcss/vite
```

**Step 2: Configure package.json**

Set `"type": "module"` and add scripts:
```json
{
  "type": "module",
  "scripts": {
    "dev": "vite dev --port 3000",
    "build": "vite build",
    "start": "node .output/server/index.mjs"
  }
}
```

**Step 3: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart(),
    tsConfigPaths(),
  ],
})
```

**Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "module": "ESNext",
    "target": "ES2022",
    "skipLibCheck": true,
    "strictNullChecks": true,
    "paths": {
      "~/*": ["./src/*"]
    }
  }
}
```

**Step 5: Create `src/styles.css`** with Tailwind import + custom theme

Tailwind v4 CSS-based config with custom colors, fonts, and utilities for the design system.

**Step 6: Create `src/router.tsx`**

```ts
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
```

**Step 7: Create `src/server.tsx`**

```ts
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { createRouter } from './router'

export default createStartHandler({ createRouter })(defaultStreamHandler)
```

**Step 8: Create `src/routes/__root.tsx`**

Root layout with `<html>`, `<head>`, `<body>`, font imports, stylesheet link, grid overlay background, dark mode class on html. Include a shared `<Navbar />` and `<Footer />` layout.

**Step 9: Create `src/routes/index.tsx`**

Basic home route placeholder to verify the app boots.

**Step 10: Run dev server and verify**

```bash
npm run dev
```

Expected: App loads at http://localhost:3000 with the root layout and home page.

**Step 11: Commit**

```bash
git add -A && git commit -m "feat: scaffold TanStack Start + Tailwind project"
```

---

### Task 2: Design System & Shared Components

**Files:**
- Create: `src/components/Navbar.tsx`
- Create: `src/components/Footer.tsx`
- Create: `src/components/ThemeToggle.tsx`
- Create: `src/components/SectionHeader.tsx`
- Create: `src/components/ServiceCard.tsx`
- Create: `src/components/StatBlock.tsx`
- Create: `src/components/TeamCard.tsx`
- Create: `src/components/BlogCard.tsx`
- Create: `src/components/ContactForm.tsx`
- Modify: `src/routes/__root.tsx` — integrate Navbar, Footer, dark mode

**Step 1: Create `ThemeToggle.tsx`**

Client-side theme toggle. Reads/writes `localStorage`, toggles `dark` class on `<html>`. Default to dark mode.

**Step 2: Create `Navbar.tsx`**

Nav with logo (`HYPER[CUBE]SPHERE` with accent highlight), nav links (Services, About, Team, Blog), CTA button (Contact). JetBrains Mono, uppercase, 3px border bottom. Include ThemeToggle. Mobile hamburger menu.

**Step 3: Create `Footer.tsx`**

3px border top, two-column layout: logo + copyright left, nav links right. Monospace font.

**Step 4: Create reusable components**

- `SectionHeader`: `// PREFIX` eyebrow, bold title, optional count badge `[ 01 — 06 ]`
- `ServiceCard`: Numbered `// 01`, uppercase title, description. Hover: shift + box-shadow in accent color.
- `StatBlock`: Large monospace number + label. Variants: accent bg, dark bg, teal tint, default.
- `TeamCard`: Photo placeholder, name, role, bio. Thick border, hover glow.
- `BlogCard`: Title, date, excerpt, category tag. Thick border + hover effect.
- `ContactForm`: Name, email, company, message fields. Thick borders, accent submit button.

**Step 5: Wire Navbar + Footer into `__root.tsx`**

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add design system and shared components"
```

---

### Task 3: Home Page

**Files:**
- Modify: `src/routes/index.tsx`

**Step 1: Build hero section**

Two-column grid: left has `// Software × AI × Security` tag, h1 with accent-highlighted word, description, two CTA buttons. Right has 2x2 stat blocks grid (50+ Systems, 99.9% Uptime, 6 Experts, 24/7 Monitoring).

**Step 2: Build trust bar**

Horizontal bar with compliance badges: Zero-Trust, ISO 27001, SOC 2 Type II, GDPR, 24/7 SOC. Bordered top and bottom.

**Step 3: Build services preview section**

SectionHeader "Services" with `[ 01 — 06 ]`, then 3x2 grid of ServiceCards. Link to /services for full details.

**Step 4: Build industries section**

SectionHeader "// Industries We Serve", grid of industry cards: Financial Services, Healthcare, Defense & Government, Retail & E-Commerce, Technology, Energy & Utilities.

**Step 5: Build CTA banner**

Full-width section with bold heading, description, and accent CTA button. Glow effect on button hover.

**Step 6: Verify and commit**

```bash
git add -A && git commit -m "feat: build home page with hero, services, industries, CTA"
```

---

### Task 4: Services Page

**Files:**
- Create: `src/routes/services.tsx`

**Step 1: Build services page**

Full detail for each service with expanded descriptions:

1. **AI Engineering** — Custom ML models, NLP, computer vision, intelligent automation, predictive analytics pipelines
2. **Software Strategy** — Architecture consulting, tech stack selection, system design, technical roadmaps, code audits
3. **Cybersecurity** — Penetration testing, red team ops, zero-trust implementation, compliance (SOC 2, ISO 27001), incident response
4. **Cloud Architecture** — Multi-cloud strategy, Kubernetes orchestration, IaC (Terraform), migration, cost optimization
5. **Data Platforms** — Real-time pipelines, data mesh, warehousing, analytics dashboards, ETL/ELT
6. **Strategic Consulting** — CTO advisory, digital transformation, team augmentation, due diligence, technology roadmaps

Each service: numbered, icon/symbol, title, full paragraph, bullet list of capabilities.

**Step 2: Add value proposition section**

"// Why HyperCubeSphere" with 3-4 differentiators.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add services page with expanded service details"
```

---

### Task 5: About Us Page

**Files:**
- Create: `src/routes/about.tsx`

**Step 1: Build about page**

- Hero: "// About Us" eyebrow, bold heading, mission statement
- Story section: Company origin/vision (placeholder text)
- Values section: 4 core values in grid (Innovation, Security, Integrity, Excellence) with `//` prefixes
- Metrics bar: stat blocks (Years in Business, Projects Delivered, Team Members, Countries Served)

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add about us page"
```

---

### Task 6: Team Page

**Files:**
- Create: `src/routes/team.tsx`

**Step 1: Build team page**

- SectionHeader: "// Our Team" / "The People Behind the Code"
- 6 team member cards in 3x2 grid:
  1. CEO & Founder — strategic vision, business development
  2. CTO — architecture, technical leadership
  3. Head of AI — machine learning, data science
  4. Head of Security — cybersecurity, compliance
  5. Lead Engineer — full-stack development
  6. Head of Operations — project management, delivery

Each card: placeholder avatar (colored div with initials), name, title, short bio, hover glow effect.

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add team page with 6 member profiles"
```

---

### Task 7: Blog Page

**Files:**
- Create: `src/routes/blog.tsx`
- Create: `src/routes/blog.$slug.tsx`

**Step 1: Build blog index page**

- SectionHeader: "// Insights" / "Latest from HyperCubeSphere"
- Grid of BlogCards (6 placeholder posts):
  1. "The Future of AI-Driven Security Operations" — AI
  2. "Zero-Trust Architecture: A Practical Implementation Guide" — Security
  3. "Building Scalable Data Pipelines with Modern Tools" — Data
  4. "Strategic Software Architecture for Growing Startups" — Software
  5. "Cloud Cost Optimization: Lessons from 50+ Migrations" — Cloud
  6. "Why Every Enterprise Needs an AI Strategy in 2026" — Strategy

Each card: title, date, excerpt, category tag, read time.

**Step 2: Build blog post detail page**

`blog.$slug.tsx` — reads slug param, renders matching post from hardcoded data array. Full article layout with title, metadata, body text (placeholder lorem).

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add blog listing and post detail pages"
```

---

### Task 8: Contact Page

**Files:**
- Create: `src/routes/contact.tsx`

**Step 1: Build contact page**

- SectionHeader: "// Get In Touch" / "Let's Build Something Together"
- Two-column layout:
  - Left: ContactForm (name, email, company, subject dropdown, message textarea, submit button)
  - Right: Contact info (email, office address placeholder, response time), plus social links placeholder
- Form uses client-side state. Submit shows a success message (no actual backend — placeholder).

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add contact page with form"
```

---

### Task 9: Privacy Policy Page

**Files:**
- Create: `src/routes/privacy.tsx`

**Step 1: Build privacy policy page**

Standard privacy policy with sections:
- Information We Collect
- How We Use Your Information
- Data Sharing and Disclosure
- Data Security
- Your Rights
- Cookies
- Changes to This Policy
- Contact Us

Styled with the brutalist design: numbered sections, `//` prefixes, monospace for headings.

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add privacy policy page"
```

---

### Task 10: Polish & Dark Mode

**Files:**
- Modify: `src/styles.css` — finalize dark/light theme transitions
- Modify: various components — verify dark mode works across all pages
- Create: `src/routes/404.tsx` — custom not-found page (if supported)

**Step 1: Test dark/light mode toggle across all pages**

Ensure all pages render correctly in both modes. Fix any color issues.

**Step 2: Add page transitions**

Subtle CSS transitions on route changes if supported.

**Step 3: Add meta tags**

Per-page `head()` with title, description, og:tags for each route.

**Step 4: Add `.gitignore`**

```
node_modules/
.output/
dist/
.vinxi/
.vite/
```

**Step 5: Final commit**

```bash
git add -A && git commit -m "feat: polish dark mode, meta tags, and final cleanup"
```
