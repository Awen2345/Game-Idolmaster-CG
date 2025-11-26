import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    open: true, // Automatically open browser
    proxy: {
      '/api': 'http://localhost:3001',
      '/assets': 'http://localhost:3001'
    }
  }
});