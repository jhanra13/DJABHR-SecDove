import { useState } from 'react'
import HttpClient from '../utils/HttpClient'
import ResultsPanel from '../components/ResultsPanel'

function EnumerationModule({ config, reporter, disabled }) {
  const [wordlistText, setWordlistText] = useState(['alice', 'bob', 'carol', 'tester'].join('\n'))
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState(null)

  const usernames = wordlistText
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)

  const start = async () => {
    if (disabled || running || !usernames.length) return
    reporter.reset()
    setSummary(null)
    setRunning(true)

    const httpClient = new HttpClient(config.baseUrl, config.authToken, config.useProxyAssist)
    for (const username of usernames) {
      try {
        const response = await httpClient.get(`/api/auth/check-username/${username}`)
        reporter.log({ module: 'enumeration', username, exists: Boolean(response?.data?.exists) })
      } catch (error) {
        reporter.log({ module: 'enumeration', username, error: error?.message })
      }
      setSummary(reporter.summarize())
    }

    setRunning(false)
  }

  return (
    <div className="module">
      <form className="module-form">
        <label>
          <span>Wordlist</span>
          <textarea value={wordlistText} onChange={(event) => setWordlistText(event.target.value)} rows={6} />
        </label>
        <p className="helper">One username per line. Use focused lists to respect rate limits.</p>
      </form>
      <div className="module-actions">
        <button type="button" onClick={start} disabled={running || disabled}>
          Run enumeration
        </button>
        <span className="helper">{usernames.length} usernames queued</span>
      </div>
      <ResultsPanel title="Enumeration log" summary={summary} reporter={reporter} />
    </div>
  )
}

export default EnumerationModule