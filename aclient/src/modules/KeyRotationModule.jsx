import { useRef, useState } from 'react'
import HttpClient from '../utils/HttpClient'
import ResultsPanel from '../components/ResultsPanel'

function KeyRotationModule({ config, reporter, disabled }) {
  const [options, setOptions] = useState({
    conversationId: '',
    rotations: 5,
    intervalMs: 2000
  })
  const [participants, setParticipants] = useState([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState(null)
  const cancelRef = useRef(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setOptions((prev) => ({
      ...prev,
      [name]: name === 'conversationId' ? value : Number(value)
    }))
  }

  const fetchParticipants = async () => {
    if (!options.conversationId) return
    setLoadingParticipants(true)
    try {
      const httpClient = new HttpClient(config.baseUrl, config.authToken, config.useProxyAssist)
      const response = await httpClient.get(`/api/conversations/${options.conversationId}`)
      setParticipants(response?.data?.participants ?? [])
    } finally {
      setLoadingParticipants(false)
    }
  }

  const stop = () => {
    cancelRef.current = true
    setRunning(false)
    setSummary(reporter.summarize())
  }

  const start = async () => {
    if (disabled || running || !options.conversationId) return
    cancelRef.current = false
    reporter.reset()
    setSummary(null)
    setRunning(true)

    const httpClient = new HttpClient(config.baseUrl, config.authToken, config.useProxyAssist)
    if (!participants.length) {
      const response = await httpClient.get(`/api/conversations/${options.conversationId}`)
      setParticipants(response?.data?.participants ?? [])
    }

    for (let i = 0; i < options.rotations && !cancelRef.current; i += 1) {
      const contentKeyNumber = i + 2
      const newKey = `mock-aes-key-${Date.now()}-${i}`
      const entries = participants.map((username) => ({
        username,
        encrypted_content_key: `mock-wrapped-${newKey}-for-${username}`
      }))

      try {
        const response = await httpClient.post(`/api/conversations/${options.conversationId}/participants`, {
          share_history: false,
          content_key_number: contentKeyNumber,
          entries,
          system_broadcast: {
            content_key_number: contentKeyNumber,
            encrypted_msg_content: 'mock-broadcast'
          }
        })
        reporter.log({ module: 'keyRotation', rotation: contentKeyNumber, status: response?.status ?? 0 })
      } catch (error) {
        reporter.log({ module: 'keyRotation', rotation: contentKeyNumber, status: error?.response?.status ?? 'error', message: error?.message })
      }
      setSummary(reporter.summarize())
      if (i < options.rotations - 1) {
        await new Promise((resolve) => setTimeout(resolve, options.intervalMs))
      }
    }

    stop()
  }

  return (
    <div className="module">
      <form className="module-form">
        <div className="row">
          <label>
            <span>Conversation ID</span>
            <input type="number" name="conversationId" value={options.conversationId} onChange={handleChange} placeholder="e.g. 1698700000000" />
          </label>
          <label>
            <span>Rotations</span>
            <input type="number" name="rotations" min={1} value={options.rotations} onChange={handleChange} />
          </label>
          <label>
            <span>Interval (ms)</span>
            <input type="number" name="intervalMs" min={100} step={100} value={options.intervalMs} onChange={handleChange} />
          </label>
        </div>
        <button type="button" className="secondary" onClick={fetchParticipants} disabled={!options.conversationId || loadingParticipants}>
          {loadingParticipants ? 'Loading participants…' : 'Preview participants'}
        </button>
        {participants.length ? (
          <p className="helper">Participants: {participants.join(', ')}</p>
        ) : (
          <p className="helper">Fetch participants to ensure you provide valid wrapped keys. Keys are mocked for demo purposes.</p>
        )}
      </form>
      <div className="module-actions">
        <button type="button" onClick={start} disabled={running || disabled}>
          Start rotations
        </button>
        <button type="button" onClick={stop} disabled={!running}>
          Stop
        </button>
        <span className="helper">{participants.length} participants targeted</span>
      </div>
      <ResultsPanel title="Rotation log" summary={summary} reporter={reporter} />
    </div>
  )
}

export default KeyRotationModule