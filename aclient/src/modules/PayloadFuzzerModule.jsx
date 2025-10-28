import { useState } from 'react'
import HttpClient from '../utils/HttpClient'
import ResultsPanel from '../components/ResultsPanel'

function PayloadFuzzerModule({ config, reporter, disabled }) {
  const [conversationId, setConversationId] = useState('')
  const [patternsText, setPatternsText] = useState(['nonHex', 'oddLengthHex', 'oversized'].join('\n'))
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState(null)

  const patterns = patternsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const generatePayload = (pattern) => {
    switch (pattern) {
      case 'nonHex':
        return 'ZZZ-not-hex'
      case 'oddLengthHex':
        return 'abcde'
      case 'oversized':
        return '00'.repeat(200_000) // ~100 KB hex
      case 'empty':
        return ''
      default:
        return pattern.startsWith('hex:') ? pattern.replace('hex:', '') : '00'
    }
  }

  const start = async () => {
    if (disabled || running || !patterns.length || !conversationId) return
    reporter.reset()
    setSummary(null)
    setRunning(true)

    const httpClient = new HttpClient(config.baseUrl, config.authToken, config.useProxyAssist)

    for (const pattern of patterns) {
      const payload = {
        conversation_id: Number(conversationId),
        content_key_number: 1,
        encrypted_msg_content: generatePayload(pattern)
      }
      try {
        const response = await httpClient.post('/api/messages', payload)
        reporter.log({ module: 'payloadFuzzer', pattern, status: response?.status ?? 0 })
      } catch (error) {
        reporter.log({ module: 'payloadFuzzer', pattern, status: error?.response?.status ?? 'error', message: error?.message })
      }
      setSummary(reporter.summarize())
    }

    setRunning(false)
  }

  return (
    <div className="module">
      <form className="module-form">
        <label>
          <span>Conversation ID</span>
          <input type="number" min={0} value={conversationId} onChange={(event) => setConversationId(event.target.value)} placeholder="e.g. 1698700000000" />
        </label>
        <label>
          <span>Patterns</span>
          <textarea value={patternsText} onChange={(event) => setPatternsText(event.target.value)} rows={6} />
        </label>
        <p className="helper">Preset names: <code>nonHex</code>, <code>oddLengthHex</code>, <code>oversized</code>, <code>empty</code>, or use <code>hex:deadbeef</code> for custom payloads.</p>
      </form>
      <div className="module-actions">
        <button type="button" onClick={start} disabled={running || disabled}>
          Run fuzzer
        </button>
        <span className="helper">{patterns.length} patterns queued</span>
      </div>
      <ResultsPanel title="Fuzzer log" summary={summary} reporter={reporter} />
    </div>
  )
}

export default PayloadFuzzerModule