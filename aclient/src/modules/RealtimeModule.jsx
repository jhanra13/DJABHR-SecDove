import { useState } from 'react'
import SocketClient from '../utils/SocketClient'

function RealtimeModule({ config, reporter }) {
  const [options, setOptions] = useState({
    startId: 1698700000000,
    endId: 1698700000100,
    joinRate: 10,
    maxSockets: 5
  })
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setOptions(prev => ({ ...prev, [name]: Number(value) }))
  }

  const start = async () => {
    setRunning(true)
    const socketClient = new SocketClient(config.socketUrl, config.authToken, config.useProxyAssist)
    await socketClient.connect()
    await socketClient.authenticate()

    const ids = []
    for (let id = options.startId; id <= options.endId; id++) {
      ids.push(id)
    }

    ids.forEach(id => {
      socketClient.emit('join-conversation', id)
      reporter.log({ module: 'realtime', action: 'join', conversationId: id })
    })

    const handler = (payload) => {
      reporter.log({ module: 'realtime', event: payload })
      setResults(reporter.summarize())
    }

    socketClient.on('new-message', handler)
    socketClient.on('message-updated', handler)
    socketClient.on('message-deleted', handler)

    // Store for stop
    window.currentSocket = socketClient
  }

  const stop = () => {
    if (window.currentSocket) {
      window.currentSocket.disconnect()
    }
    setRunning(false)
    setResults(reporter.summarize())
  }

  return (
    <div className="module">
      <h2>Realtime Eavesdrop & Room Flood</h2>
      <form>
        <label>Start Conversation ID: <input type="number" name="startId" value={options.startId} onChange={handleChange} /></label>
        <label>End Conversation ID: <input type="number" name="endId" value={options.endId} onChange={handleChange} /></label>
        <label>Join Rate: <input type="number" name="joinRate" value={options.joinRate} onChange={handleChange} /></label>
        <label>Max Sockets: <input type="number" name="maxSockets" value={options.maxSockets} onChange={handleChange} /></label>
      </form>
      <button onClick={start} disabled={running}>Start</button>
      <button onClick={stop} disabled={!running}>Stop</button>
      {results && (
        <div>
          <h3>Results</h3>
          <p>Total Events: {results.totalEvents}</p>
          <ul>
            {results.recentEvents.map((e, i) => <li key={i}>{JSON.stringify(e)}</li>)}
          </ul>
          <button onClick={() => navigator.clipboard.writeText(reporter.exportCSV())}>Copy CSV</button>
          <button onClick={() => navigator.clipboard.writeText(reporter.exportJSON())}>Copy JSON</button>
        </div>
      )}
    </div>
  )
}

export default RealtimeModule