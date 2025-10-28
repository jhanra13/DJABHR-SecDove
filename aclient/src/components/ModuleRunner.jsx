import RealtimeModule from '../modules/RealtimeModule'
import ApiFloodModule from '../modules/ApiFloodModule'
import SqlProbeModule from '../modules/SqlProbeModule'
import PayloadFuzzerModule from '../modules/PayloadFuzzerModule'
import KeyRotationModule from '../modules/KeyRotationModule'
import EnumerationModule from '../modules/EnumerationModule'

function ModuleRunner({ moduleKey, config, reporter }) {
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

  return <ModuleComponent config={config} reporter={reporter} />
}

export default ModuleRunner