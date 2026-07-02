import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  // GitHub Pages serves the app under /voca/, but the local dev server has no
  // such prefix — serving dev under '/' avoids the base-path mismatch that
  // makes URLs like http://localhost:5173/voca?word=… fail.
  base: command === 'build' ? '/voca/' : '/',
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['kokoro-js', '@mintplex-labs/piper-tts-web', 'onnxruntime-web'],
  },
}))
