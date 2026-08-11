import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        viewer: path.resolve(__dirname, 'viewer.html'),
        config: path.resolve(__dirname, 'config.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@icons': path.resolve(__dirname, '../src/assets/icons'),
      '@main':  path.resolve(__dirname, '../src'),
    },
  },
});
