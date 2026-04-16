import type { GraphResponse } from '../types/graph'

interface SidebarProps {
  graph: GraphResponse | null
}

function renderTextBlock(label: string, value: string | null) {
  return (
    <section className="sidebar-section">
      <h3>{label}</h3>
      <p>{value || 'No data available.'}</p>
    </section>
  )
}

export function Sidebar({ graph }: SidebarProps) {
  if (!graph) {
    return (
      <aside className="sidebar">
        <h2>Course Details</h2>
        <p>Select a course to inspect its parsed prerequisite data.</p>
      </aside>
    )
  }

  return (
    <aside className="sidebar">
      <h2>{graph.rootCourse.code}</h2>
      <p className="sidebar-title">{graph.rootCourse.title}</p>
      <div className="sidebar-meta">
        <span>Parse status: {graph.rootCourse.parseStatus}</span>
        <span>Max depth: {graph.meta.maxDepth}</span>
        <span>Coreqs: {graph.meta.includeCoreqs ? 'Included' : 'Hidden'}</span>
      </div>
      {renderTextBlock('Raw prerequisite text', graph.rawPrerequisiteText)}
      {renderTextBlock('Raw corequisite text', graph.rawCorequisiteText)}
      {renderTextBlock('Description', graph.rootCourse.description)}
    </aside>
  )
}
