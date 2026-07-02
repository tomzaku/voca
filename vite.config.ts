import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  // GitHub Pages serves the app under /voca/, but the local dev server has no
  // such prefix — serving dev under '/' avoids the base-path mismatch that
  // makes URLs like http://localhost:5173/voca?word=… fail.
  base: command === 'build' ? '/voca/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Voca — Daily Vocabulary',
        short_name: 'Voca',
        description: 'Learn vocabulary through fun games.',
        theme_color: '#1b1246',
        background_color: '#1b1246',
        // Hide the browser chrome when installed. `fullscreen` also hides the
        // status bar on Android; falls back to `standalone` (no address bar)
        // where fullscreen isn't supported.
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // Precache only the app shell. The heavy TTS/model chunks (Kokoro,
        // Transformers, ONNX Runtime, Piper) load on demand, so keep them out
        // of the precache to keep install small and preserve lazy loading.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['**/kokoro*', '**/transformers*', '**/ort*', '**/piper*', '**/voices_static*'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['kokoro-js', '@mintplex-labs/piper-tts-web', 'onnxruntime-web'],
  },
}))
