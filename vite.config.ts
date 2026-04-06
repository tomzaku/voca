import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  base: '/voca/',
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['kokoro-js', '@mintplex-labs/piper-tts-web', 'onnxruntime-web'],
  },
})
