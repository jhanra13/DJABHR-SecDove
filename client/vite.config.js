import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Ensure environment variables are properly defined during build
      'process.env': {}
    },
    server: {
      port: Number(env.VITE_DEV_PORT) || 5173,
      proxy: {
        '/register': env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000',
        '/ws': {
          target: env.VITE_SOCKET_URL || 'http://localhost:8000',
          ws: true
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'terser'
    }
  };
});

