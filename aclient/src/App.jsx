import { useMemo, useState, useEffect } from 'react'
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

  const modules = useMemo(() => ([
    {
      name: 'Realtime Eavesdrop & Room Flood',
      key: 'realtime',
      description: 'Authenticate and join arbitrary Socket.IO rooms to observe metadata delivery and gateway stability.',
      checklist: ['Define a tight conversation ID range before scaling up.', 'Start with low join rates to respect the target test budget.']
    },
    {
      name: 'API Flood & Bounds Testing',
      key: 'apiFlood',
      description: 'Exercise high-impact API endpoints with configurable concurrency, payload sizes, and durations.',
      checklist: ['Match base URL to the HTTPS origin of the SecureDove server.', 'Keep duration short while exploring safe limits.']
    },
    {
      name: 'SQL Injection Prober',
      key: 'sqlProbe',
      description: 'Send negative test payloads to confirm parameter binding and log any unexpected responses.',
      checklist: ['Craft probe cases per endpoint and review the response snippets for anomalies.']
    },
    {
      name: 'Message Payload Fuzzer',
      key: 'payloadFuzzer',
      description: 'Submit malformed ciphertext variations to evaluate server storage and client-side resilience.',
      checklist: ['Target a conversation you control and observe decrypt failures in the report.']
    },
    {
      name: 'Key Rotation / Participation Stress',
      key: 'keyRotation',
      description: 'Automate authorized key rotations to trigger broadcast storms and database row churn.',
      checklist: ['Fetch participants before running and monitor broadcast counts in the logs.']
    },
    {
      name: 'Username Enumeration',
      key: 'enumeration',
      description: 'Probe username existence endpoints and export aggregated findings.',
      checklist: ['Provide a curated wordlist to avoid unnecessary load on the target.']
    }
  ]), [])

  const isConfigValid = Boolean(targetConfig.baseUrl && targetConfig.socketUrl)
  const activeModule = modules.find((module) => module.key === selectedModule)

  useEffect(() => {
    reporter.reset()
  }, [reporter, selectedModule])

  return (
    <div className="app">
      <header>
        <h1>aclient - SecureDove Assessment Client</h1>
      </header>
      <div className="main">
        <aside>
          <ConnectPanel config={targetConfig} setConfig={setTargetConfig} isValid={isConfigValid} />
          <ModuleSelector modules={modules} selected={selectedModule} onSelect={setSelectedModule} />
        </aside>
        <main>
          {!activeModule && (
            <div className="empty-state">
              <h2>Select an assessment module</h2>
              <p>Use the sidebar to configure the target and choose a module to begin testing.</p>
            </div>
          )}
          {activeModule && (
            <ModuleRunner
              moduleKey={selectedModule}
              moduleMeta={activeModule}
              config={targetConfig}
              reporter={reporter}
              isConfigValid={isConfigValid}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
