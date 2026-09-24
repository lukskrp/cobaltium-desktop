import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@renderer/App'
import { ThemeProvider } from '@renderer/providers/ThemeProvider'
import '@renderer/styles/globals.css'
import '@renderer/styles/chat.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
