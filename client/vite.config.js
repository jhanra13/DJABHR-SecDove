import fs from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const httpsConfig = ((mode) => {
  // Load .env variables for this mode so they are available in the config
  const env = loadEnv(mode, process.cwd(), '');
  const certPath = env.VITE_DEV_CERT;
  const keyPath = env.VITE_DEV_KEY;
  if (!certPath || !keyPath) return undefined;
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.warn('[vite] HTTPS disabled: certificate files not found.');
    return undefined;
  }
  return {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath)
  };
});

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    // Ensure environment variables are properly defined during build
    'process.env': {}
  },
  server: {
    host: true,
    port: 5173,
    https: httpsConfig(mode),
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: process.env.VITE_SOCKET_PROXY ?? 'http://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser'
  }
}));
