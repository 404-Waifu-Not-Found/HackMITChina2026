import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'

export default defineConfig({
  site: 'https://404-waifu-not-found.github.io',
  base: '/HackMITChina2026',
  integrations: [tailwind({ applyBaseStyles: false })],
  output: 'static',
})
