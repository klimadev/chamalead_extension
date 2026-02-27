import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { OptionsApp } from '../app/options/OptionsApp'
import '../styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>,
)
