import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import '@/lib/i18n'

// Handle OAuth token BEFORE React renders
const params = new URLSearchParams(window.location.search)
const token = params.get('token')
const userStr = params.get('user')
if (token && userStr) {
  try {
    const user = JSON.parse(decodeURIComponent(userStr))
    const stored = { state: { user, token, isAuthenticated: true }, version: 0 }
    localStorage.setItem('globipet-auth', JSON.stringify(stored))
    // Clean URL
    window.history.replaceState({}, '', '/')
  } catch(e) { console.error('OAuth parse error:', e) }
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
