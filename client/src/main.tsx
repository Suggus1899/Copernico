import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './components/Theme'
import 'bootswatch/dist/lux/bootstrap.min.css'
import './index.css'
import './design-system.css'
import './student-pages.css'
import './theme.css'

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el contenedor de la aplicación');
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ThemeProvider><App /></ThemeProvider>
  </React.StrictMode>
)
