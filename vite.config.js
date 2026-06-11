import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // 3001, not 3000 — the tgr dev server owns 3000, and its Next.js IPv6
    // wildcard listener lets both bind "successfully" while the browser
    // silently routes localhost:3000 to the wrong app
    port: 3001,
    strictPort: true,
    open: true
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
            return 'react'
          }
          if (/node_modules\/d3(-[^/]+)?\//.test(id)) {
            return 'd3'
          }
          if (id.includes('node_modules/styled-components/')) {
            return 'styled-components'
          }
          if (
            /node_modules\/(react-markdown|remark-|rehype-|micromark|mdast-|hast-|unist-|unified|vfile|estree-util-|character-entities|property-information|space-separated-tokens|comma-separated-tokens|html-url-attributes|trim-lines|bail|trough|devlop|decode-named-character-reference|markdown-table|ccount|longest-streak|zwitch|escape-string-regexp|is-plain-obj|style-to-(js|object))/.test(id)
          ) {
            return 'markdown'
          }
        }
      }
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './src/test/setup.js',
  }
})
