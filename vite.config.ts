import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// VITE_BASE lets the same build be served from a domain root ("/") or a GitHub Pages
// project site ("/marriage-invitation-app/").
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
