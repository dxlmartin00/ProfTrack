import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Register auto-updating offline service worker
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('ProfTrack update available');
  },
  onOfflineReady() {
    console.log('ProfTrack is ready for 100% offline usage');
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
