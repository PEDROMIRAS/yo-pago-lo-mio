import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages sirve el repo en /<nombre-del-repo>/; el workflow lo pasa en BASE_PATH
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Yo pago lo mío',
        short_name: 'Pago lo mío',
        description: 'Reparte la cuenta de la cena: quién ha pedido qué y quién paga a quién.',
        lang: 'es',
        display: 'standalone',
        theme_color: '#c2410c',
        background_color: '#fffaf3',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // json para que las cartas queden precacheadas y funcionen sin cobertura
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'] },
    }),
  ],
})
