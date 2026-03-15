import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
      },
      pages: [
        { path: '/', prerender: { enabled: true, crawlLinks: true } },
        { path: '/services' },
        { path: '/about' },
        { path: '/team' },
        { path: '/blog', prerender: { enabled: true, crawlLinks: true } },
        { path: '/blog/future-of-ai-driven-security-operations' },
        { path: '/blog/zero-trust-architecture-practical-guide' },
        { path: '/blog/building-scalable-data-pipelines' },
        { path: '/blog/strategic-software-architecture-startups' },
        { path: '/blog/cloud-cost-optimization-lessons' },
        { path: '/blog/every-enterprise-needs-ai-strategy' },
        { path: '/contact' },
        { path: '/privacy' },
        { path: '/404' },
      ],
    }),
    viteReact(),
  ],
})
