import React from 'react'
import ReactDOM from 'react-dom/client'
import { ERPProvider } from './context/ERPContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <ERPProvider>
        <App />
      </ERPProvider>
    </ToastProvider>
  </React.StrictMode>,
)
