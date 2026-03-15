import { defineConfig, type Plugin } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { blogPosts } from './src/data/blog-posts'

const SITE_URL = 'https://hypercubesphere.online'

const staticPages: Array<{
  path: string
  changefreq: string
  priority: string
}> = [
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

      const staticUrls = staticPages
        .map(
          (page) => `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
        )
        .join('\n')

      const blogUrls = blogPosts
        .map((post) => {
          const lastmod = new Date(post.date).toISOString().split('T')[0]
          return `  <url>
    <loc>${SITE_URL}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
  </url>`
        })
        .join('\n')

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${blogUrls}
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
        { path: '/', prerender: { enabled: true, crawlLinks: true } },
        { path: '/services' },
        { path: '/about' },
        { path: '/team' },
        { path: '/blog', prerender: { enabled: true, crawlLinks: true } },
        ...blogPosts.map((post) => ({ path: `/blog/${post.slug}` })),
        { path: '/contact' },
        { path: '/privacy' },
        { path: '/404' },
      ],
    }),
    viteReact(),
    sitemapPlugin(),
  ],
})
