import { useState } from 'react'
import HttpClient from '../utils/HttpClient'

function KeyRotationModule({ config, reporter }) {
  const [options, setOptions] = useState({
    conversationId: 123,
    rotations: 5,
    intervalMs: 2000
  })
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setOptions(prev => ({ ...prev, [name]: Number(value) }))
  }

  const start = async () => {
    setRunning(true)
    const httpClient = new HttpClient(config.baseUrl, config.authToken, config.useProxyAssist)

    // Fetch participants
    const convRes = await httpClient.get(`/api/conversations/${options.conversationId}`)
    const participants = convRes.data.participants || []

    for (let i = 0; i < options.rotations; i++) {
      // Mock crypto
      const newKey = 'mock-aes-key-' + i
      const entries = participants.map(user => ({
        username: user,
        encrypted_content_key: 'mock-wrapped-' + newKey + '-for-' + user
      }))

      const res = await httpClient.post(`/api/conversations/${options.conversationId}/participants`, {
        share_history: false,
        content_key_number: i + 2,
        entries,
        system_broadcast: { content_key_number: i + 2, encrypted_msg_content: 'mock-broadcast' }
      })
      reporter.log({ module: 'keyRotation', rotation: i, status: res.status })

      await new Promise(resolve => setTimeout(resolve, options.intervalMs))
    }

    setRunning(false)
    setResults(reporter.summarize())
  }

  return (
    <div className="module">
      <h2>Key Rotation/Participation Stress</h2>
      <form>
        <label>Conversation ID: <input type="number" name="conversationId" value={options.conversationId} onChange={handleChange} /></label>
        <label>Rotations: <input type="number" name="rotations" value={options.rotations} onChange={handleChange} /></label>
        <label>Interval (ms): <input type="number" name="intervalMs" value={options.intervalMs} onChange={handleChange} /></label>
      </form>
      <button onClick={start} disabled={running}>Start Rotations</button>
      {results && (
        <div>
          <h3>Results</h3>
          <p>Total Rotations: {results.totalEvents}</p>
          <button onClick={() => navigator.clipboard.writeText(reporter.exportCSV())}>Copy CSV</button>
          <button onClick={() => navigator.clipboard.writeText(reporter.exportJSON())}>Copy JSON</button>
        </div>
      )}
    </div>
  )
}

export default KeyRotationModule