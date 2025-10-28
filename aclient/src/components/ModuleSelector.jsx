function ModuleSelector({ modules, selected, onSelect }) {
  return (
    <div className="module-selector">
      <h2>Assessment Modules</h2>
      <div className="module-list">
        {modules.map((module) => {
          const isActive = selected === module.key
          return (
            <button
              key={module.key}
              type="button"
              className={`module-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(module.key)}
            >
              <div className="card-header">
                <h3>{module.name}</h3>
                <span>{isActive ? 'Selected' : 'Open'}</span>
              </div>
              <p>{module.description}</p>
              {module.checklist?.length ? (
                <ul className="card-checklist">
                  {module.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ModuleSelector