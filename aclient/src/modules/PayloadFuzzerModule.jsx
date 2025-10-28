import { useState } from 'react'
import HttpClient from '../utils/HttpClient'

function PayloadFuzzerModule({ config, reporter }) {
  const [options, setOptions] = useState({
    conversationId: 123,
    patterns: ['nonHex', 'oddLengthHex', 'oversized']
  })
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setOptions(prev => ({ ...prev, [name]: name === 'patterns' ? value.split('\n') : value }))
  }

  const generatePayload = (pattern) => {
    switch (pattern) {
      case 'nonHex': return 'ZZZ-not-hex'
      case 'oddLengthHex': return 'abcde'
      case 'oversized': return '00'.repeat(100000) // large
      default: return '00'
    }
  }

  const start = async () => {
    setRunning(true)
    const httpClient = new HttpClient(config.baseUrl, config.authToken, config.useProxyAssist)

    for (const pattern of options.patterns) {
      const payload = {
        conversation_id: options.conversationId,
        content_key_number: 1,
        encrypted_msg_content: generatePayload(pattern)
      }
      const res = await httpClient.post('/api/messages', payload)
      reporter.log({ module: 'payloadFuzzer', pattern, status: res.status })
    }

    setRunning(false)
    setResults(reporter.summarize())
  }

  return (
    <div className="module">
      <h2>Message Payload Fuzzer</h2>
      <form>
        <label>Conversation ID: <input type="number" name="conversationId" value={options.conversationId} onChange={handleChange} /></label>
        <label>Patterns: <textarea value={options.patterns.join('\n')} onChange={handleChange} /></label>
      </form>
      <button onClick={start} disabled={running}>Run Fuzzer</button>
      {results && (
        <div>
          <h3>Results</h3>
          <ul>
            {results.recentEvents.map((e, i) => <li key={i}>{e.pattern}: {e.status}</li>)}
          </ul>
          <button onClick={() => navigator.clipboard.writeText(reporter.exportCSV())}>Copy CSV</button>
          <button onClick={() => navigator.clipboard.writeText(reporter.exportJSON())}>Copy JSON</button>
        </div>
      )}
    </div>
  )
}

export default PayloadFuzzerModule