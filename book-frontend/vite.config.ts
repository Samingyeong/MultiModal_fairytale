import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 모든 API/프록시 요청을 캐시 서버(port 4000)로 위임
      '/api/lib048':   { target: 'http://localhost:4000', changeOrigin: true },
      '/api/books':    { target: 'http://localhost:4000', changeOrigin: true },
      '/api/kpicture': { target: 'http://localhost:4000', changeOrigin: true },
      '/proxy':        { target: 'http://localhost:4000', changeOrigin: true },
      '/dict':         { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
})
