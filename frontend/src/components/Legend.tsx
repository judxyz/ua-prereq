export function Legend() {
  return (
    <aside className="graph-legend" aria-label="Graph legend">
      <h3>Legend</h3>
      <div className="legend-row app-muted-text">
        <span className="legend-item">
          <i aria-hidden="true" className="legend-icon legend-icon-prereq" />
          Prerequisite
        </span>
        <span className="legend-item">
          <i aria-hidden="true" className="legend-icon legend-icon-coreq" />
          Corequisite
        </span>
      </div>
    </aside>
  )
}
