import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import '@/lib/i18n'

// Ε12: ΚΑΜΙΑ συνεδρία από το URL. Παλιότερα, ένα `?token=` ή `#token=` σε
// οποιονδήποτε σύνδεσμο προς το globipet.com γραφόταν κατευθείαν ως συνεδρία:
// ένας επιτιθέμενος έστελνε σύνδεσμο με το ΔΙΚΟ ΤΟΥ τοκεν, το θύμα έβλεπε
// «συνδεδεμένο» λογαριασμό και ό,τι ανέβαζε (κατοικίδια, μηνύματα, κρατήσεις)
// κατέληγε σε εκείνον (session fixation). Η σύνδεση Google/Facebook στο web
// επιστρέφει πλέον στο /auth/complete με κωδικό μίας χρήσης (App.tsx), όχι τοκεν.

// Apply theme before React renders to prevent flash of light mode
try {
  const stored = localStorage.getItem('globipet-theme')
  if (stored) {
    const { state } = JSON.parse(stored)
    if (state?.theme === 'dark' || (state?.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    }
  }
} catch {}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
