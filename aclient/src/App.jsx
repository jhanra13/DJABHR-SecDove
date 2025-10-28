import { useState, useEffect } from 'react'
import './App.css'
import ConnectPanel from './components/ConnectPanel'
import ModuleSelector from './components/ModuleSelector'
import ModuleRunner from './components/ModuleRunner'
import Reporter from './utils/Reporter'

function App() {
  const [targetConfig, setTargetConfig] = useState({
    baseUrl: '',
    socketUrl: '',
    useProxyAssist: false,
    authToken: ''
  })
  const [selectedModule, setSelectedModule] = useState(null)
  const [reporter] = useState(new Reporter())

  const modules = [
    { name: 'Realtime Eavesdrop & Room Flood', key: 'realtime' },
    { name: 'API Flood & Bounds Testing', key: 'apiFlood' },
    { name: 'SQL Injection Prober', key: 'sqlProbe' },
    { name: 'Message Payload Fuzzer', key: 'payloadFuzzer' },
    { name: 'Key Rotation/Participation Stress', key: 'keyRotation' },
    { name: 'Username Enumeration', key: 'enumeration' }
  ]

  return (
    <div className="app">
      <header>
        <h1>aclient - SecureDove Assessment Client</h1>
      </header>
      <div className="main">
        <aside>
          <ConnectPanel config={targetConfig} setConfig={setTargetConfig} />
          <ModuleSelector modules={modules} selected={selectedModule} onSelect={setSelectedModule} />
        </aside>
        <main>
          {selectedModule && (
            <ModuleRunner
              moduleKey={selectedModule}
              config={targetConfig}
              reporter={reporter}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
