import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolve } from 'path';

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    return {
      plugins: [basicSsl()],
      server: { host: true }
    };
  } else {
    return {
      base: '/AppMindAr/', // tu repo en GitHub Pages
      build: {
        outDir: 'docs',      // <- build final va a docs/
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'index.html'),
            dino: resolve(__dirname, 'dino.html'),
            minas: resolve(__dirname, 'minas.html'),
            elements: resolve(__dirname, 'elements.html'),
            scanner: resolve(__dirname, 'scanner.html'),
            'arjs-scanner': resolve(__dirname, 'arjs-scanner.html')
          }
        }
      }
    };
  }
});
