import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './designsprak.css'
import './del-forste-mote.css'
import './del-start-nedteller.css'
import './del-nedteller-storskjerm.css'
import App from './components/App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// iPadOS 14 og 15 (Safari før 15.4) mangler Object.hasOwn; veggskjermen skal også kjøre der.
// Laveste støttede versjon er satt i vite.config.js (safari14).
if (typeof Object.hasOwn !== 'function') {
  Object.defineProperty(Object, 'hasOwn', {
    value: (obj, key) => Object.prototype.hasOwnProperty.call(Object(obj), key),
    configurable: true, writable: true,
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
