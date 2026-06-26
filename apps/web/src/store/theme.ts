import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  applyTheme: () => void
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyThemeToDOM(theme: Theme) {
  if (typeof document === 'undefined') return
  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme
  if (effectiveTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        set({ theme })
        applyThemeToDOM(theme)
      },
      toggleTheme: () => {
        const current = get().theme
        const next: Theme = current === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        applyThemeToDOM(next)
      },
      applyTheme: () => {
        applyThemeToDOM(get().theme)
      },
    }),
    {
      name: 'globipet-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToDOM(state.theme)
        }
      },
    }
  )
)

// Listen for system theme changes if in 'system' mode
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useThemeStore.getState()
    if (state.theme === 'system') {
      applyThemeToDOM('system')
    }
  })
}
