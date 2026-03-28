import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'

export default defineConfig({
  site: 'https://unoxyrich.github.io',
  base: '/Lingo-Stream',
  integrations: [tailwind({ applyBaseStyles: false })],
  output: 'static',
})
