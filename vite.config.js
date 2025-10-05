import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/AppMindAr/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dino: resolve(__dirname, 'dino.html')
      }
    }
  }
})
