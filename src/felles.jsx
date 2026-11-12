/**
 * Felles oppstart for alle sidene i Klasseskjerm: hovedsiden (index.html)
 * og den egne nedteller-siden (timer/index.html).
 *
 * Stiler og reserveløsninger hentes her, ett sted. Nye CSS-filer legges til
 * i lista under, så får begge sidene dem med en gang.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './designsprak.css'
import './del-forste-mote.css'
import './del-start-nedteller.css'
import './del-nedteller-storskjerm.css'
import './del-sette-opp-time.css'
import './del-hovedskjerm-avstand.css'
import './del-ipad-elev.css'
import './del-ipad-overlapp.css'
import './del-egen-nedteller.css'
import './del-om.css'
import './del-skoletema.css'
import './del-innlogging.css'
import './del-bursdag.css'
import './del-tidslinje-rom.css'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Innlogging from './components/Innlogging.jsx'

// iPadOS 14 og 15 (Safari før 15.4) mangler Object.hasOwn; veggskjermen skal også kjøre der.
// Laveste støttede versjon er satt i vite.config.js (safari14).
if (typeof Object.hasOwn !== 'function') {
  Object.defineProperty(Object, 'hasOwn', {
    value: (obj, key) => Object.prototype.hasOwnProperty.call(Object(obj), key),
    configurable: true, writable: true,
  })
}

/**
 * Tegner siden inn i #root, med samme feilsikring overalt. På skolens egen
 * adresse må en ansatt først logge inn (se Innlogging.jsx).
 * `kanStarteNy: false` for sider som ikke eier timeplanen: da kan ikke
 * feilsiden tilby å legge timeplanen bort.
 */
export function startSide(Side, { kanStarteNy = true } = {}) {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary kanStarteNy={kanStarteNy}>
        <Innlogging>
          <Side />
        </Innlogging>
      </ErrorBoundary>
    </StrictMode>,
  )
}
