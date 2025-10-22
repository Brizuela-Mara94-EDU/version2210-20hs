import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolve } from 'path';

// Usamos una función para que la configuración sea dinámica
export default defineConfig(({ command }) => {
  // Si estás ejecutando 'npm run dev', el comando es 'serve'
  if (command === 'serve') {
    // --- CONFIGURACIÓN PARA DESARROLLO LOCAL ---
    return {
      // No definimos 'base', por lo que usará la raíz '/' por defecto.
      plugins: [
        basicSsl() // Necesario para HTTPS y la cámara
      ],
      server: {
        host: true
      }
    };
  } else {
    // --- CONFIGURACIÓN PARA PRODUCCIÓN (GitHub Pages) ---
    // Si estás ejecutando 'npm run build', el comando es 'build'
    return {
      base: '/AppMindAr/',
      build: {
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'index.html'),
            dino: resolve(__dirname, 'dino.html'),
            minas: resolve(__dirname, 'minas.html')
          }
        }
      }
    };
  }
});