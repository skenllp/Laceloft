import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiOrigin = new URL(env.VITE_API_BASE || 'https://eleven-with-backend.onrender.com/api').origin
  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'og-image.png'],
      manifest: {
        name: 'Laceloft — Find Your Next Sole',
        short_name: 'Laceloft',
        description: 'Curated sneakers and everyday footwear. Enquire directly through WhatsApp.',
        start_url: '/',
        display: 'standalone',
        background_color: '#F4F0E8',
        theme_color: '#F4F0E8',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // This is a client-side routed SPA (react-router BrowserRouter),
        // so unknown routes must fall back to index.html.
        navigateFallback: '/index.html',
        // Never let the SW intercept/cache calls to the separately-hosted
        // Django API on Render — those must always hit the network live.
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Product images served from the Django /media/ folder — safe to
            // cache since they rarely change once uploaded. Must be listed
            // BEFORE the catch-all rule below (Workbox matches in order).
            urlPattern: ({ url }) =>
              url.origin === apiOrigin &&
              url.pathname.startsWith('/media/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'laceloft-product-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Everything else on the API origin (products, cart, orders,
            // auth, etc.) must always hit the network live — never cached.
            urlPattern: ({ url }) => url.origin === apiOrigin,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: false, // flip to true only if you want to test SW in `npm run dev`
      },
    }),
  ],
  }
})
