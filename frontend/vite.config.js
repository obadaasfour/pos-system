import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', 
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Cash POS SaaS',
        short_name: 'CashPOS',
        description: 'Advanced Point of Sale System',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 4000000,
        // ✅ تم إزالة إجبار الـ navigateFallback لكي لا يعمل كاش خاطئ على الروابط الفرعية
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    // ─── Code Splitting for faster navigation ───────────────────
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries - cached long-term
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI & animation libraries
          'vendor-ui': ['framer-motion', 'lucide-react'],
          // Form/notification utilities
          'vendor-utils': ['axios', 'sweetalert2', 'react-hot-toast'],
          // Charting (heavy - separate chunk)
          'vendor-charts': ['recharts'],
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: false,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://pos-nginx-backend:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})