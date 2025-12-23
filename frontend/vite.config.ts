import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks - third-party libraries
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // Other node_modules can be grouped or left as default
            return 'vendor';
          }
          
          // Large component chunks
          if (id.includes('Dashboard.tsx')) {
            return 'dashboard';
          }
          if (id.includes('ClientDetailsModal.tsx')) {
            return 'client-details';
          }
          
          // Utils chunks
          if (id.includes('utils/api.ts') || id.includes('utils/firebase.ts')) {
            return 'utils';
          }
          
          // Other components
          if (id.includes('components/')) {
            return 'components';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Increase limit to 1MB for better chunking
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: [
      '.loca.lt',
      'localhost',
      '127.0.0.1'
    ],
    hmr: {
      clientPort: 5173
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5173
  }
})

