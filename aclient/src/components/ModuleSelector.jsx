function ModuleSelector({ modules, selected, onSelect }) {
  return (
    <div className="module-selector">
      <h2>Assessment Modules</h2>
      <ul>
        {modules.map(module => (
          <li key={module.key}>
            <button
              className={selected === module.key ? 'selected' : ''}
              onClick={() => onSelect(module.key)}
            >
              {module.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ModuleSelector