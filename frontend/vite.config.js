import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/entries': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/todos': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
    watch: {
      // 在 Docker / WSL 等不支持 inotify 的环境才开启轮询，避免原生开发时的额外 CPU 占用
      usePolling: Boolean(process.env.VITE_USE_POLLING),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
