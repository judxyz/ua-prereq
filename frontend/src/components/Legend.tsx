export function Legend() {
  return (
    <section className="panel legend">
      <h3>Legend</h3>
      <div className="legend-grid">
        <span><i className="legend-swatch legend-course" /> Course node</span>
        <span><i className="legend-swatch legend-group" /> Group node</span>
        <span><i className="legend-line legend-prereq" /> Prerequisite edge</span>
        <span><i className="legend-line legend-coreq" /> Corequisite edge</span>
      </div>
    </section>
  )
}
