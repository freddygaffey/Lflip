import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'map': ['leaflet', 'react-leaflet'],
          'charts': ['chart.js', 'react-chartjs-2'],
          'capacitor': [
            '@capacitor/core',
            '@capacitor/geolocation',
            '@capacitor/motion',
            '@capacitor/preferences',
          ],
        },
      },
    },
  },
});
