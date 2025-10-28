import Papa from 'papaparse'

class Reporter {
  constructor() {
    this.reset()
  }

  reset() {
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
      recentEvents: [...this.events].slice(-10)
    }
  }

  exportCSV() {
    if (!this.events.length) return ''
    return Papa.unparse(this.events)
  }

  exportJSON(pretty = true) {
    return JSON.stringify({ events: this.events, metrics: this.metrics }, null, pretty ? 2 : undefined)
  }
}

export default Reporter