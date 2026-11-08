import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Klasseromsskjerm/',
  build: {
    // Laveste støttede nettleser: Safari 14 (iPadOS 14), for veggskjermen på en eldre iPad.
    // Holder også 100vh-reserveverdier og top/left/right/bottom i CSS-en.
    target: ['es2020', 'safari14'],
    cssTarget: ['safari14'],
  },
})
