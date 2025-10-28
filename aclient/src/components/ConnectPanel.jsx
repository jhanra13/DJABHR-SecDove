import { useEffect, useState } from 'react'

function ConnectPanel({ config, setConfig, isValid }) {
  const [form, setForm] = useState(config)

  useEffect(() => {
    setForm(config)
  }, [config])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const nextValue = type === 'checkbox' ? checked : value
    setForm((prev) => {
      const updated = { ...prev, [name]: nextValue }
      setConfig((current) => ({ ...current, [name]: nextValue }))
      if (name === 'baseUrl' && !updated.socketUrl) {
        setConfig((current) => ({ ...current, socketUrl: nextValue }))
        updated.socketUrl = nextValue
      }
      return updated
    })
  }

  return (
    <div className="connect-panel">
      <div className="panel-header">
        <h2>Target Configuration</h2>
        <span className={`status-pill ${isValid ? 'ok' : 'warn'}`}>
          {isValid ? 'Ready' : 'Awaiting details'}
        </span>
      </div>
      <p className="panel-description">
        Provide the SecureDove API origin, Socket.IO URL, and an authentication token. Updates are saved automatically.
      </p>
      <form className="stacked">
        <label>
          <span>Base URL</span>
          <input
            type="url"
            name="baseUrl"
            value={form.baseUrl}
            onChange={handleChange}
            placeholder="https://target.example.com"
            required
          />
        </label>
        <label>
          <span>Socket URL</span>
          <input
            type="url"
            name="socketUrl"
            value={form.socketUrl}
            onChange={handleChange}
            placeholder="https://target.example.com"
            required
          />
        </label>
        <label>
          <span>Auth Token</span>
          <textarea
            name="authToken"
            value={form.authToken}
            onChange={handleChange}
            placeholder="Paste bearer token from /api/auth/login"
            rows={4}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            name="useProxyAssist"
            checked={form.useProxyAssist}
            onChange={handleChange}
          />
          Route traffic through local Proxy Assist (http://localhost:3001)
        </label>
      </form>
      <div className="panel-footnote">
        ↳ Proxy Assist injects headers such as <code>X-Forwarded-For</code>; start it with <code>npm run proxy</code> when required.
      </div>
    </div>
  )
}

export default ConnectPanel