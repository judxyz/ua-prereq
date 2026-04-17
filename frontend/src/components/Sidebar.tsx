import type { GraphResponse } from '../types/graph'

interface SidebarProps {
  graph: GraphResponse | null
  selectedMaxDepth: number
}

function renderTextBlock(label: string, value: string | null) {
  return (
    <section className="sidebar-section">
      <h3>{label}</h3>
      <p>{value || 'No data available.'}</p>
    </section>
  )
}

export function Sidebar({ graph, selectedMaxDepth }: SidebarProps) {
  if (!graph) {
    return (
      <article style={{ margin: 0 }} aria-label="Course details">
        <h2>Course Details</h2>
        <p>Select a course to inspect its parsed prerequisite data.</p>
      </article>
    )
  }

  return (
    <article style={{ margin: 0 }} aria-label="Course details">
      <h2>{graph.rootCourse.code}</h2>
      <p>{graph.rootCourse.title}</p>
      <div style={{ display: 'grid', gap: '0.25rem', fontSize: '0.92rem' }}>
        <span>Parse status: {graph.rootCourse.parseStatus}</span>
        <span>Max course depth: {selectedMaxDepth}</span>
        <span>Coreqs: {graph.meta.includeCoreqs ? 'Included' : 'Hidden'}</span>
      </div>
      {renderTextBlock('Raw prerequisite text', graph.rawPrerequisiteText)}
      {renderTextBlock('Raw corequisite text', graph.rawCorequisiteText)}
      {renderTextBlock('Description', graph.rootCourse.description)}
    </article>
  )
}
