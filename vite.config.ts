import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// User site on GitHub Pages (rohanreddybandi.github.io), so it's served from the root.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
})
