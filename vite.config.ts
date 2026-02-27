import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx, type ManifestV3Export } from '@crxjs/vite-plugin'

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: 'ChamaLead Extension',
  description: 'Base moderna e componetizada para uma extensao grande.',
  version: '0.1.0',
  permissions: ['storage', 'tabs'],
  host_permissions: ['<all_urls>'],
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
      matches: ['<all_urls>'],
      run_at: 'document_idle',
    },
  ],
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), crx({ manifest })],
})
