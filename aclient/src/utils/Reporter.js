class Reporter {
  constructor() {
    this.events = []
    this.metrics = {}
  }

  log(event) {
    this.events.push({ ...event, timestamp: Date.now() })
  }

  metric(name, value) {
    if (!this.metrics[name]) this.metrics[name] = []
    this.metrics[name].push({ value, timestamp: Date.now() })
  }

  summarize() {
    return {
      totalEvents: this.events.length,
      metrics: this.metrics,
      recentEvents: this.events.slice(-10)
    }
  }

  exportCSV() {
    // Use papaparse to generate CSV
    const Papa = require('papaparse')
    return Papa.unparse(this.events)
  }

  exportJSON() {
    return JSON.stringify({ events: this.events, metrics: this.metrics }, null, 2)
  }
}

export default Reporter