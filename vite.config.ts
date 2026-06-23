/// <reference types="vitest" />

import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  // no @vitejs/plugin-legacy: the app only runs in modern iOS/Android WebViews,
  // and its inline detection/loader scripts were blocked by our CSP (script-src
  // 'self'), which broke startup. dropping it keeps index.html CSP-clean.
  plugins: [
    vue()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
