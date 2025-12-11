import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig,loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: "./",
      server: {
        port: 5173,
        host: '0.0.0.0',
        headers: {
          // Required for SharedArrayBuffer and WASM in some browsers
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
        },
      },
      build: {
        chunkSizeWarningLimit: 1500,
        target: 'esnext', // Required for top-level await in WASM modules
      },
      plugins: [tailwindcss(), react()],
      optimizeDeps: {
        exclude: ['ghostty-web'], // Don't pre-bundle ghostty-web to preserve WASM imports
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
