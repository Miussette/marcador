import { createRoot } from 'react-dom/client'
import { DisplayApp } from './DisplayApp'
import './display.css'

const container = document.getElementById('root')
if (!container) throw new Error('No se encontró el contenedor #root')

if (!window.api) {
  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#05070A;color:#F8FAFC;font-family:Segoe UI,sans-serif;text-align:center;padding:24px">
      <div>
        <h1 style="font-size:18px">Pantalla sin conexión</h1>
        <p style="color:#94A3B8;font-size:13px;margin-top:8px">No se pudo establecer el puente IPC con el proceso principal.</p>
      </div>
    </div>`
} else {
  createRoot(container).render(<DisplayApp />)
}
