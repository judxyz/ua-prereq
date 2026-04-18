export function Legend() {
  return (
    <aside className="graph-legend" aria-label="Graph legend">
      <h3>Legend</h3>
      <div className="legend-item">
        <div className="legend-sample legend-sample-course">CMPUT 101</div>
        <span>Course</span>
      </div>
      <div className="legend-item">
        <div className="legend-sample legend-sample-and" />
        <span>AND</span>
      </div>
      <div className="legend-item">
        <div className="legend-sample legend-sample-or" />
        <span>OR</span>
      </div>
      <div className="legend-item">
        <div className="legend-line legend-line-and" />
        <span>AND edge</span>
      </div>
      <div className="legend-item">
        <div className="legend-line legend-line-or" />
        <span>OR edge</span>
      </div>
      <div className="legend-item">
        <div className="legend-line legend-line-coreq" />
        <span>Corequisite edge</span>
      </div>
    </aside>
  )
}
