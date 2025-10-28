import { useState } from 'react'

function ConnectPanel({ config, setConfig }) {
  const [form, setForm] = useState(config)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setConfig(form)
  }

  return (
    <div className="connect-panel">
      <h2>Target Configuration</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Base URL:
          <input
            type="text"
            name="baseUrl"
            value={form.baseUrl}
            onChange={handleChange}
            placeholder="https://target.example.com"
          />
        </label>
        <label>
          Socket URL:
          <input
            type="text"
            name="socketUrl"
            value={form.socketUrl}
            onChange={handleChange}
            placeholder="https://target.example.com"
          />
        </label>
        <label>
          Auth Token:
          <textarea
            name="authToken"
            value={form.authToken}
            onChange={handleChange}
            placeholder="Bearer token from login"
          />
        </label>
        <label>
          <input
            type="checkbox"
            name="useProxyAssist"
            checked={form.useProxyAssist}
            onChange={handleChange}
          />
          Use Proxy Assist
        </label>
        <button type="submit">Update Config</button>
      </form>
    </div>
  )
}

export default ConnectPanel