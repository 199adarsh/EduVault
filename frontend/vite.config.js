import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['react-markdown']
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@xyflow')) {
              return 'vendor-xyflow';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('react-pdf') || id.includes('pdfjs-dist') || id.includes('mammoth')) {
              return 'vendor-pdf';
            }
            if (id.includes('framer-motion') || id.includes('motion/')) {
              return 'vendor-motion';
            }
          }
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true,
      }
    },
    headers: {
      'Permissions-Policy': 'autoplay=*, fullscreen=*, picture-in-picture=*',
    }
  }
})
