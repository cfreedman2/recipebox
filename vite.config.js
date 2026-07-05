import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Cloud sync is optional (npm run install:cloud). When the package is absent,
// alias it to a stub so dev and build work without it.
const hasSupabase = fs.existsSync(
  path.resolve(__dirname, 'node_modules/@supabase/supabase-js'),
)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: hasSupabase
      ? {}
      : { '@supabase/supabase-js': path.resolve(__dirname, 'src/lib/supabaseStub.js') },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
