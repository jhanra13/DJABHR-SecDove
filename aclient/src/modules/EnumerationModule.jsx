import { useState } from 'react'
import HttpClient from '../utils/HttpClient'

function EnumerationModule({ config, reporter }) {
  const [options, setOptions] = useState({
    wordlist: ['alice', 'bob', 'carol', 'tester']
  })
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState(null)

  const handleChange = (e) => {
    setOptions({ wordlist: e.target.value.split('\n') })
  }

  const start = async () => {
    setRunning(true)
    const httpClient = new HttpClient(config.baseUrl, config.authToken, config.useProxyAssist)

    for (const username of options.wordlist) {
      const res = await httpClient.get(`/api/auth/check-username/${username}`)
      reporter.log({ module: 'enumeration', username, exists: res.data.exists })
    }

    setRunning(false)
    setResults(reporter.summarize())
  }

  return (
    <div className="module">
      <h2>Username Enumeration</h2>
      <form>
        <label>Wordlist: <textarea value={options.wordlist.join('\n')} onChange={handleChange} /></label>
      </form>
      <button onClick={start} disabled={running}>Run Enumeration</button>
      {results && (
        <div>
          <h3>Results</h3>
          <ul>
            {results.recentEvents.map((e, i) => <li key={i}>{e.username}: {e.exists ? 'exists' : 'not found'}</li>)}
          </ul>
          <button onClick={() => navigator.clipboard.writeText(reporter.exportCSV())}>Copy CSV</button>
          <button onClick={() => navigator.clipboard.writeText(reporter.exportJSON())}>Copy JSON</button>
        </div>
      )}
    </div>
  )
}

export default EnumerationModule