import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import '@/lib/i18n'

// Handle OAuth token BEFORE React renders
// Support both ?token= (query) and #token= (hash) formats
const handleOAuthToken = () => {
  try {
    // Check query params
    const params = new URLSearchParams(window.location.search)
    let token = params.get('token')
    let userStr = params.get('user')

    // Check hash (for Google OAuth redirect)
    if (!token && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
      token = hashParams.get('token')
      userStr = hashParams.get('user')
    }

    if (token) {
      let user = null
      if (userStr) {
        try { user = JSON.parse(decodeURIComponent(userStr)) } catch {}
      }
      
      if (user) {
        const stored = { state: { user, token, isAuthenticated: true }, version: 0 }
        localStorage.setItem('globipet-auth', JSON.stringify(stored))
      } else {
        // Just store token, fetch user after
        const existing = localStorage.getItem('globipet-auth')
        const parsed = existing ? JSON.parse(existing) : { state: {}, version: 0 }
        parsed.state.token = token
        parsed.state.isAuthenticated = true
        localStorage.setItem('globipet-auth', JSON.stringify(parsed))
      }
      
      // Clean URL
      window.history.replaceState({}, '', '/')
    }
  } catch(e) { 
    console.error('OAuth parse error:', e) 
  }
}

handleOAuthToken()

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
