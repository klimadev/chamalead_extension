import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PopupApp } from '../app/popup/PopupApp'
import '../styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>,
)
