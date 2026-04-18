import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controls } from '../components/Controls'
import { GraphCanvas } from '../components/GraphCanvas'
import { Legend } from '../components/Legend'
import { SearchBar } from '../components/SearchBar'
import { useCourseGraph } from '../hooks/useCourseGraph'
import { formatCourseCodeForDisplay, formatCourseCodeForRoute } from '../lib/courseCode'

export function GraphPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const {
    selectedCourseCode,
    maxDepth,
    includeCoreqs,
    graph,
    isLoading,
    error,
    setSelectedCourseCode,
    setMaxDepth,
    setIncludeCoreqs,
  } = useCourseGraph(formatCourseCodeForDisplay(code))

  useEffect(() => {
    setSelectedCourseCode(formatCourseCodeForDisplay(code))
  }, [code, setSelectedCourseCode])

  return (
    <main className="app-shell">
      <header className="app-header">
        <h2>University of Alberta Course Prerequisites</h2>
      </header>

      <section className="app-search-section">
        <SearchBar
          initialValue={selectedCourseCode}
          onSelectCourse={(courseCode) => navigate(`/graph/${formatCourseCodeForRoute(courseCode)}`)}
        />
        <Controls
          maxDepth={maxDepth}
          includeCoreqs={includeCoreqs}
          onMaxDepthChange={setMaxDepth}
          onIncludeCoreqsChange={setIncludeCoreqs}
        />
        {isLoading ? <div className="app-status">Loading graph data...</div> : null}
        {error ? <div className="app-status app-status-error">{error}</div> : null}
      </section>

      <section className="graph-section">
        <Legend />
        <GraphCanvas graph={graph} />
      </section>
    </main>
  )
}
