import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import './index.css'

const container = document.getElementById('root')
if (!container) throw new Error('No se encontró el contenedor #root')

if (!window.api) {
  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0B0F14;color:#F8FAFC;font-family:Segoe UI,sans-serif;padding:24px;text-align:center">
      <div>
        <h1 style="font-size:20px;margin-bottom:8px">No se pudo conectar con el proceso de escritorio</h1>
        <p style="color:#94A3B8;font-size:14px;max-width:520px">
          El puente IPC (preload) no está disponible. Reinicia la aplicación con <code style="color:#60A5FA">npm run dev</code>.
        </p>
      </div>
    </div>`
} else {
  createRoot(container).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  )
}
