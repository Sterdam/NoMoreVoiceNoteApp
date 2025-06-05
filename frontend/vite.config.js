import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        // Utiliser le nom du service Docker
        target: 'http://backend:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('proxy error', err);
            if (res && res.writeHead) {
              res.writeHead(500, {
                'Content-Type': 'text/plain',
              });
              res.end('Proxy error: Could not connect to backend server');
            }
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[PROXY] Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[PROXY] Response:', proxyRes.statusCode, req.url);
          });
        }
      }
    },
    watch: {
      usePolling: true
    }
  },
  base: '/'
})