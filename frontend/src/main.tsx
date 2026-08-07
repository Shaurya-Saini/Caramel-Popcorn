import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/dynapuff'
import '@fontsource-variable/manrope'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { LocationProvider } from './context/LocationContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LocationProvider>
          <App />
        </LocationProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
