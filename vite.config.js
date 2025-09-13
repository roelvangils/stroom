import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/stroom/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
}))