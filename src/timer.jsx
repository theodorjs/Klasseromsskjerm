import { startSide } from './felles.jsx'
import NedtellerSide from './components/NedtellerSide.jsx'

// Siden leser bare timeplanen, og feilsiden skal aldri kunne legge den bort
startSide(NedtellerSide, { kanStarteNy: false })
