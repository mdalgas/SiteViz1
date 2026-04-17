import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Omit StrictMode — double-invocation in dev conflicts with R3F canvas init
createRoot(document.getElementById('root')!).render(<App />)
