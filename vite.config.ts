import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx, type ManifestV3Export } from '@crxjs/vite-plugin'
import { fileURLToPath, URL } from 'node:url'

const VERSION = '0.5.8'

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: 'ChamaLead Extension',
  description: 'Base moderna e componetizada para uma extensao grande.',
  version: VERSION,
  permissions: ['storage', 'tabs', 'scripting'],
  host_permissions: ['https://web.whatsapp.com/*', 'https://www.instagram.com/*'],
  background: {
    service_worker: 'src/extension/background.ts',
    type: 'module',
  },
  action: {
    default_title: 'ChamaLead',
    default_popup: 'index.html',
  },
  options_page: 'options.html',
  content_scripts: [
    {
      js: ['src/extension/content.ts'],
      matches: ['https://web.whatsapp.com/*'],
      run_at: 'document_idle',
    },
    {
      js: ['src/extension/content.ts'],
      matches: ['https://www.instagram.com/*'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['vendor/wppconnect-wa.js', 'vendor/chamalead-page-bridge.js'],
      matches: ['https://web.whatsapp.com/*'],
    },
    {
      resources: ['vendor/chamalead-instagram-page-bridge.js'],
      matches: ['https://www.instagram.com/*'],
    },
  ],
}

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    EXT_VERSION: JSON.stringify(VERSION),
  },
  plugins: [react(), crx({ manifest })],
})
