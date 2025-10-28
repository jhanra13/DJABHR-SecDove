function ResultsPanel({ title = 'Latest activity', summary, reporter }) {
  const { totalEvents = 0, recentEvents = [] } = summary || {}

  const download = (type) => {
    if (typeof window === 'undefined') return
    const data = type === 'csv' ? reporter.exportCSV() : reporter.exportJSON()
    if (!data) return
    const blob = new Blob([data], { type: type === 'csv' ? 'text/csv' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = type === 'csv' ? 'aclient-report.csv' : 'aclient-report.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <section className="results-panel">
      <header>
        <h3>{title}</h3>
        <span>{totalEvents} events logged</span>
      </header>
      {recentEvents.length ? (
        <ul>
          {recentEvents.map((event, idx) => (
            <li key={`${event.timestamp}-${idx}`}>
              <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
              <pre>{JSON.stringify(event, null, 2)}</pre>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Run the module to see activity.</p>
      )}
      <div className="results-actions">
        <button type="button" onClick={() => download('csv')} disabled={!totalEvents}>
          Download CSV
        </button>
        <button type="button" onClick={() => download('json')} disabled={!totalEvents}>
          Download JSON
        </button>
      </div>
    </section>
  )
}

export default ResultsPanel
