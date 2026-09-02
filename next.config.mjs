/** @type {import('next').NextConfig} */

// GitHub Pages serves this project from /provdsimulation, but local dev and a
// future Vercel deploy serve from the root. Gate the prefix on an env var so
// `pnpm dev` keeps clean URLs.
const isPages = process.env.GITHUB_PAGES === 'true'

const nextConfig = {
  output: 'export',
  basePath: isPages ? '/provdsimulation' : '',
  // Emits founders-office/index.html so Pages serves it without a rewrite rule.
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
