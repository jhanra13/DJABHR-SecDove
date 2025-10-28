import RealtimeModule from '../modules/RealtimeModule'
import ApiFloodModule from '../modules/ApiFloodModule'
import SqlProbeModule from '../modules/SqlProbeModule'
import PayloadFuzzerModule from '../modules/PayloadFuzzerModule'
import KeyRotationModule from '../modules/KeyRotationModule'
import EnumerationModule from '../modules/EnumerationModule'

function ModuleRunner({ moduleKey, moduleMeta, config, reporter, isConfigValid }) {
  const moduleComponents = {
    realtime: RealtimeModule,
    apiFlood: ApiFloodModule,
    sqlProbe: SqlProbeModule,
    payloadFuzzer: PayloadFuzzerModule,
    keyRotation: KeyRotationModule,
    enumeration: EnumerationModule
  }

  const ModuleComponent = moduleComponents[moduleKey]

  if (!ModuleComponent) return <div>Select a module</div>

  return (
    <section className="module-shell">
      <header className="module-shell__header">
        <div>
          <h2>{moduleMeta.name}</h2>
          <p>{moduleMeta.description}</p>
          {moduleMeta.checklist?.length ? (
            <ul className="module-checklist">
              {moduleMeta.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className={`status-pill ${isConfigValid ? 'ok' : 'warn'}`}>
          {isConfigValid ? 'Target ready' : 'Configure target to enable run'}
        </div>
      </header>
      <ModuleComponent
        config={config}
        reporter={reporter}
        disabled={!isConfigValid}
        moduleMeta={moduleMeta}
      />
    </section>
  )
}

export default ModuleRunner