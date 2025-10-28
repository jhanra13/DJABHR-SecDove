import { useEffect, useRef, useState } from 'react'
import SocketClient from '../utils/SocketClient'
import ResultsPanel from '../components/ResultsPanel'

function RealtimeModule({ config, reporter, disabled }) {
  const [options, setOptions] = useState({
    startId: 1698700000000,
    endId: 1698700000100,
    joinRate: 25,
    maxSockets: 5
  })
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState(null)
  const [progress, setProgress] = useState({ joined: 0, total: 0 })
  const socketRef = useRef(null)
  const intervalRef = useRef(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setOptions((prev) => ({ ...prev, [name]: Number(value) }))
  }

  useEffect(() => () => {
    if (socketRef.current) socketRef.current.disconnect()
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    setRunning(false)
    setSummary(reporter.summarize())
  }

  const start = async () => {
    if (disabled || running) return
    reporter.reset()
    setSummary(null)

    const socketClient = new SocketClient(config.socketUrl, config.authToken, config.useProxyAssist)
    socketRef.current = socketClient

    await socketClient.connect()
    await socketClient.authenticate()

    const totalRooms = Math.max(options.endId - options.startId + 1, 0)
    setProgress({ joined: 0, total: totalRooms })

    const joinIds = []
    for (let id = options.startId; id <= options.endId; id += 1) {
      joinIds.push(id)
    }

    const batchSize = Math.max(1, options.joinRate)
    let cursor = 0

    const joinBatch = () => {
      const batch = joinIds.slice(cursor, cursor + batchSize)
      batch.forEach((id) => {
        socketClient.emit('join-conversation', id)
        reporter.log({ module: 'realtime', action: 'join', conversationId: id })
      })
      cursor += batch.length
      setProgress((prev) => ({ ...prev, joined: cursor }))
      if (cursor >= joinIds.length) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    intervalRef.current = setInterval(joinBatch, 1000)
    joinBatch()

    const handler = (eventName) => (payload) => {
      reporter.log({ module: 'realtime', eventName, payload })
      setSummary(reporter.summarize())
    }

    socketClient.on('new-message', handler('new-message'))
    socketClient.on('message-updated', handler('message-updated'))
    socketClient.on('message-deleted', handler('message-deleted'))

    setRunning(true)
  }

  return (
    <div className="module">
      <form className="module-form grid">
        <label>
          <span>Start conversation ID</span>
          <input type="number" name="startId" value={options.startId} onChange={handleChange} min={0} />
        </label>
        <label>
          <span>End conversation ID</span>
          <input type="number" name="endId" value={options.endId} onChange={handleChange} min={options.startId} />
        </label>
        <label>
          <span>Join rate (rooms/sec)</span>
          <input type="number" name="joinRate" value={options.joinRate} onChange={handleChange} min={1} />
        </label>
        <label>
          <span>Max sockets</span>
          <input type="number" name="maxSockets" value={options.maxSockets} onChange={handleChange} min={1} />
        </label>
      </form>
      <div className="module-actions">
        <button type="button" onClick={start} disabled={running || disabled}>
          Start listening
        </button>
        <button type="button" onClick={stop} disabled={!running}>
          Stop
        </button>
        <span className="helper">Joined {progress.joined}/{progress.total} rooms</span>
      </div>
      <ResultsPanel title="Realtime events" summary={summary} reporter={reporter} />
    </div>
  )
}

export default RealtimeModule