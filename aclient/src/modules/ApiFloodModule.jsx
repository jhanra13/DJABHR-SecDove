import { useState } from 'react'
import HttpClient from '../utils/HttpClient'

function ApiFloodModule({ config, reporter }) {
  const [options, setOptions] = useState({
    concurrency: 8,
    durationSec: 60,
    bodySizeKB: 1024,
    endpoints: ['POST /api/auth/login', 'GET /api/messages/123?limit=1000']
  })
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setOptions(prev => ({ ...prev, [name]: name === 'endpoints' ? value.split('\n') : Number(value) }))
  }

  const start = async () => {
    setRunning(true)
    const httpClient = new HttpClient(config.baseUrl, config.authToken, config.useProxyAssist)

    const endTime = Date.now() + options.durationSec * 1000
    const promises = []

    while (Date.now() < endTime) {
      for (let i = 0; i < options.concurrency; i++) {
        const endpoint = options.endpoints[Math.floor(Math.random() * options.endpoints.length)]
        const [method, path] = endpoint.split(' ')
        const body = method === 'POST' ? { data: 'x'.repeat(options.bodySizeKB * 1024) } : null

        const promise = (method === 'POST' ? httpClient.post(path, body) : httpClient.get(path))
          .then(res => {
            reporter.log({ module: 'apiFlood', endpoint, status: res.status, latency: Date.now() })
          })
        promises.push(promise)
      }
      await Promise.all(promises)
    }

    setRunning(false)
    setResults(reporter.summarize())
  }

  const stop = () => {
    setRunning(false)
    setResults(reporter.summarize())
  }

  return (
    <div className="module">
      <h2>API Flood & Bounds Testing</h2>
      <form>
        <label>Concurrency: <input type="number" name="concurrency" value={options.concurrency} onChange={handleChange} /></label>
        <label>Duration (sec): <input type="number" name="durationSec" value={options.durationSec} onChange={handleChange} /></label>
        <label>Body Size (KB): <input type="number" name="bodySizeKB" value={options.bodySizeKB} onChange={handleChange} /></label>
        <label>Endpoints (one per line): <textarea name="endpoints" value={options.endpoints.join('\n')} onChange={handleChange} /></label>
      </form>
      <button onClick={start} disabled={running}>Start</button>
      <button onClick={stop} disabled={!running}>Stop</button>
      {results && (
        <div>
          <h3>Results</h3>
          <p>Total Requests: {results.totalEvents}</p>
          <button onClick={() => navigator.clipboard.writeText(reporter.exportCSV())}>Copy CSV</button>
          <button onClick={() => navigator.clipboard.writeText(reporter.exportJSON())}>Copy JSON</button>
        </div>
      )}
    </div>
  )
}

export default ApiFloodModule