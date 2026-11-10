import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Sidene som bygges. Hver får sin egen adresse på GitHub Pages:
 *   index.html        → …/Klasseskjerm/
 *   timer/index.html  → …/Klasseskjerm/timer/  (nedtelleren som egen side)
 * Begge bruker den samme koden, så endringer i nedtelleren gjelder begge.
 */
const SIDER = {
  main: 'index.html',
  timer: 'timer/index.html',
}

/** Stopper bygget (og dermed publiseringen) hvis en av sidene mangler i resultatet. */
function sjekkAtAlleSiderFinnes() {
  return {
    name: 'klasseskjerm:sjekk-sider',
    apply: 'build',
    // writeBundle: HTML-sidene legges til helt sist, etter generateBundle
    writeBundle(_options, bundle) {
      const mangler = Object.values(SIDER).filter(side => !bundle[side])
      if (mangler.length) {
        this.error(`Bygget mangler ${mangler.join(', ')}. Sjekk SIDER i vite.config.js.`)
      }
    },
  }
}

/**
 * Utviklingsserveren: /timer uten skråstrek ga hovedsiden. GitHub Pages
 * sender selv /timer videre til /timer/, så dette gjelder bare lokalt.
 */
function skraastrekEtterSider() {
  const sti = (req, res, next) => {
    const [path, query = ''] = (req.url || '').split('?')
    const side = Object.values(SIDER).find(fil => fil !== 'index.html' && `/${fil.replace(/\/index\.html$/, '')}` === path)
    if (!side) return next()
    res.statusCode = 302
    res.setHeader('Location', `${path}/${query ? `?${query}` : ''}`)
    res.end()
  }
  return {
    name: 'klasseskjerm:skraastrek-etter-sider',
    configureServer(server) { server.middlewares.use(sti) },
    configurePreviewServer(server) { server.middlewares.use(sti) },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sjekkAtAlleSiderFinnes(), skraastrekEtterSider()],
  // Relativ base: siden virker uansett hvilken mappe den ligger i på GitHub Pages
  // (både /Klasseskjerm/ og en eventuell gammel adresse).
  base: './',
  build: {
    // Laveste støttede nettleser: Safari 14 (iPadOS 14), for veggskjermen på en eldre iPad.
    // Holder også 100vh-reserveverdier og top/left/right/bottom i CSS-en.
    target: ['es2020', 'safari14'],
    cssTarget: ['safari14'],
    rollupOptions: {
      input: Object.fromEntries(
        Object.entries(SIDER).map(([navn, fil]) => [navn, fileURLToPath(new URL(fil, import.meta.url))]),
      ),
    },
  },
})
