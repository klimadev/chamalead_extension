import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { OptionsPage } from '@/pages'
import '@/styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OptionsPage />
  </StrictMode>,
)
