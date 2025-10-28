import { useMemo, useRef, useState } from 'react'
import HttpClient from '../utils/HttpClient'
import ResultsPanel from '../components/ResultsPanel'

function ApiFloodModule({ config, reporter, disabled }) {
  const [options, setOptions] = useState({
    concurrency: 6,
    durationSec: 45,
    bodySizeKB: 512,
    endpoints: ['POST /api/messages', 'GET /api/messages/123?limit=1000', 'POST /api/auth/login']
  })
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState(null)
  const controllerRef = useRef({ cancelled: false })

  const parsedEndpoints = useMemo(
    () => options.endpoints.map((line) => line.trim()).filter(Boolean),
    [options.endpoints]
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setOptions((prev) => ({
      ...prev,
      [name]: name === 'endpoints' ? value.split('\n') : Number(value)
    }))
  }

  const stop = () => {
    controllerRef.current.cancelled = true
    setRunning(false)
    setSummary(reporter.summarize())
  }

  const start = async () => {
    if (disabled || running || !parsedEndpoints.length) return
    controllerRef.current.cancelled = false
    reporter.reset()
    setSummary(null)

    const httpClient = new HttpClient(config.baseUrl, config.authToken, config.useProxyAssist)
    const endAt = Date.now() + options.durationSec * 1000

    const worker = async () => {
      while (Date.now() < endAt && !controllerRef.current.cancelled) {
        const endpoint = parsedEndpoints[Math.floor(Math.random() * parsedEndpoints.length)]
        const [method = 'GET', ...pathParts] = endpoint.split(' ')
        const path = pathParts.join(' ') || '/'
        const payload = method.toUpperCase() === 'POST'
          ? { data: 'x'.repeat(options.bodySizeKB * 1024) }
          : undefined

        const started = performance.now()
        try {
          const response = method.toUpperCase() === 'POST'
            ? await httpClient.post(path, payload)
            : await httpClient.get(path)
          reporter.log({
            module: 'apiFlood',
            endpoint,
            status: response?.status ?? 0,
            latencyMs: Math.round(performance.now() - started)
          })
        } catch (error) {
          reporter.log({
            module: 'apiFlood',
            endpoint,
            status: error?.status ?? error?.response?.status ?? 'error',
            message: error?.message
          })
        }
        setSummary(reporter.summarize())
      }
    }

    setRunning(true)
    await Promise.all(Array.from({ length: Math.max(1, options.concurrency) }, worker))
    stop()
  }

  return (
    <div className="module">
      <form className="module-form">
        <div className="row">
          <label>
            <span>Concurrency</span>
            <input type="number" name="concurrency" min={1} value={options.concurrency} onChange={handleChange} />
          </label>
          <label>
            <span>Duration (seconds)</span>
            <input type="number" name="durationSec" min={1} value={options.durationSec} onChange={handleChange} />
          </label>
          <label>
            <span>Body size (KB)</span>
            <input type="number" name="bodySizeKB" min={1} value={options.bodySizeKB} onChange={handleChange} />
          </label>
        </div>
        <label>
          <span>Endpoints (one per line, METHOD /path)</span>
          <textarea name="endpoints" value={options.endpoints.join('\n')} onChange={handleChange} rows={5} />
        </label>
      </form>
      <div className="module-actions">
        <button type="button" onClick={start} disabled={running || disabled}>
          Start flood
        </button>
        <button type="button" onClick={stop} disabled={!running}>
          Stop
        </button>
        <span className="helper">Randomly samples {parsedEndpoints.length} endpoints</span>
      </div>
      <ResultsPanel title="API flood log" summary={summary} reporter={reporter} />
    </div>
  )
}

export default ApiFloodModule