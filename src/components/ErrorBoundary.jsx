import { Component, useEffect, useState } from 'react';
import { downloadBackup } from '../utils/backup.js';
import { safeGetItem, safeRemoveItem, stashRescuedData } from '../utils/storage.js';

function formatClock() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** En klokke som faktisk går – en frossen klokke på en tavle er verre enn ingen. */
function FallbackClock() {
  const [time, setTime] = useState(formatClock);
  useEffect(() => {
    const id = setInterval(() => setTime(formatClock()), 10_000);
    return () => clearInterval(id);
  }, []);
  return <div className="error-fallback-time">{time}</div>;
}

/**
 * Siste skanse mot hvit skjerm foran klassen: fanger feil i alt under seg og
 * viser en rolig side med klokke og mulighet til å laste på nytt eller
 * laste ned en sikkerhetskopi. Leser aldri lagring uten try/catch.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, backupDone: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Klasseromsskjerm krasjet:', error, info?.componentStack);
  }

  /**
   * Siste utvei når krasjen skyldes lagrede data: legg dagens data til side
   * (tidsstemplet redningskopi, aldri overskriving) og start med standardoppsettet.
   */
  startFresh() {
    if (!confirm('Starte med standardtimeplanen? Dagens data slettes ikke, men legges til side i en redningskopi.')) return;
    stashRescuedData(safeGetItem('klasseromData'));
    safeRemoveItem('klasseromData');
    safeRemoveItem('currentClassName');
    safeRemoveItem('activeTimelineClassNames');
    window.location.reload();
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="error-fallback" role="alert">
        <FallbackClock />
        <h1 className="error-fallback-title">Noe gikk galt</h1>
        <p className="error-fallback-text">
          Timeplanen din er trygt lagret på denne maskinen. Last inn siden på nytt for å fortsette.
        </p>
        <div className="error-fallback-actions">
          <button type="button" className="neumorphic-btn" onClick={() => window.location.reload()}>
            Last inn på nytt
          </button>
          <button
            type="button"
            className="neumorphic-btn"
            onClick={() => this.setState({ backupDone: downloadBackup() })}
          >
            {this.state.backupDone ? '✓ Sikkerhetskopi lastet ned' : 'Last ned sikkerhetskopi'}
          </button>
        </div>
        <button type="button" className="error-fallback-link" onClick={() => this.startFresh()}>
          Skjer det igjen? Start med standardtimeplanen
        </button>
        <details className="error-fallback-details">
          <summary>Teknisk informasjon</summary>
          <pre>{String(this.state.error?.stack || this.state.error)}</pre>
        </details>
      </div>
    );
  }
}
