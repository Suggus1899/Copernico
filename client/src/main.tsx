import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import 'bootswatch/dist/lux/bootstrap.min.css'
import './index.css'
import './design-system.css'
import './student-pages.css'

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el contenedor de la aplicación');
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
