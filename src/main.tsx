import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext.tsx'; // Import ThemeProvider
// AuthProvider is now included within App.tsx, wrapping the Router
// No need to wrap it here again.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider> {/* Wrap App with ThemeProvider */}
      <App />
    </ThemeProvider>
  </StrictMode>,
)
