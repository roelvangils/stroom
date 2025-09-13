import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/stroom/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})