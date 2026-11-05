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
      // Allow YouTube (privacy-enhanced mode) to load in iframes
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube-nocookie.com https://www.youtube.com",
        "frame-src 'self' blob: https://www.youtube-nocookie.com https://www.youtube.com https://s3.ca-east-006.backblazeb2.com https://docs.google.com",
        "img-src 'self' data: blob: https: http:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' http://localhost:10000 http://localhost:8081 https://api.dicebear.com https://s3.ca-east-006.backblazeb2.com",
        "media-src 'self' blob: https://www.youtube-nocookie.com https://www.youtube.com",
      ].join('; '),
      'Permissions-Policy': 'autoplay=*, fullscreen=*, picture-in-picture=*',
    }
  }
})
