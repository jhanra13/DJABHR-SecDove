import { useState } from 'react'
import HttpClient from '../utils/HttpClient'
import ResultsPanel from '../components/ResultsPanel'

function SqlProbeModule({ config, reporter, disabled }) {
  const [probesText, setProbesText] = useState([
    "GET /api/messages/1%20OR%201=1",
    "GET /api/contacts/bob'%20OR%20'1'='1/public-key",
    'GET /api/messages/123?limit=1;--'
  ].join('\n'))
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState(null)

  const probes = probesText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const runProbe = async (httpClient, probe) => {
    const [method = 'GET', ...pathParts] = probe.split(' ')
    const path = pathParts.join(' ') || '/'
    try {
      const response = method.toUpperCase() === 'POST'
        ? await httpClient.post(path, {})
        : await httpClient.get(path)
      reporter.log({ module: 'sqlProbe', probe, status: response?.status ?? 0, sample: response?.data })
    } catch (error) {
      reporter.log({ module: 'sqlProbe', probe, status: error?.response?.status ?? 'error', message: error?.message })
    }
    setSummary(reporter.summarize())
  }

  const start = async () => {
    if (disabled || running || !probes.length) return
    reporter.reset()
    setSummary(null)
    setRunning(true)
    const httpClient = new HttpClient(config.baseUrl, config.authToken, config.useProxyAssist)
    for (const probe of probes) {
      await runProbe(httpClient, probe)
    }
    setRunning(false)
  }

  return (
    <div className="module">
      <form className="module-form">
        <label>
          <span>Probe payloads</span>
          <textarea value={probesText} onChange={(event) => setProbesText(event.target.value)} rows={6} />
        </label>
        <p className="helper">Each line should be formatted as <code>METHOD /path?query</code>. Payloads are sent sequentially.</p>
      </form>
      <div className="module-actions">
        <button type="button" onClick={start} disabled={running || disabled}>
          Run probes
        </button>
        <span className="helper">{probes.length} probes queued</span>
      </div>
      <ResultsPanel title="SQL probe log" summary={summary} reporter={reporter} />
    </div>
  )
}

export default SqlProbeModule