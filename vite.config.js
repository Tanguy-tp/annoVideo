// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: 'src',          // React code is here
  base: './',           // use relative paths for Electron
  build: {
    outDir: '../dist',  // output goes to ./dist/
    sourcemap: false,
    emptyOutDir: true,
  },
  minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined, // if code-splitting not needed
      },
    },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});