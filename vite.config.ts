import { defineConfig, type Plugin } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { locales, blogSlugs } from './src/i18n/config'

const SITE_URL = 'https://hypercubesphere.online'

const staticPages = [
  { path: '/', changefreq: 'monthly', priority: '1.0' },
  { path: '/services', changefreq: 'monthly', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.8' },
  { path: '/team', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
  { path: '/contact', changefreq: 'monthly', priority: '0.7' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
]

function sitemapPlugin(): Plugin {
  return {
    name: 'generate-sitemap',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(process.cwd(), 'dist/client')
      if (!existsSync(outDir)) return

      const urls: string[] = []

      for (const locale of locales) {
        for (const page of staticPages) {
          urls.push(`  <url>
    <loc>${SITE_URL}/${locale}${page.path === '/' ? '' : page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`)
        }
        for (const slug of blogSlugs) {
          urls.push(`  <url>
    <loc>${SITE_URL}/${locale}/blog/${slug}</loc>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
  </url>`)
        }
      }

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

      writeFileSync(resolve(outDir, 'sitemap.xml'), sitemap)
    },
  }
}

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
        { path: '/' },
        ...(locales as readonly string[]).flatMap((l) => [
          { path: `/${l}`, prerender: { crawlLinks: true } },
          { path: `/${l}/services` },
          { path: `/${l}/about` },
          { path: `/${l}/team` },
          { path: `/${l}/blog`, prerender: { crawlLinks: true } },
          ...blogSlugs.map((slug) => ({ path: `/${l}/blog/${slug}` })),
          { path: `/${l}/contact` },
          { path: `/${l}/privacy` },
        ]),
        { path: '/404' },
      ],
    }),
    viteReact(),
    sitemapPlugin(),
  ],
})
