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
    <main className="container app-shell">
      <article className="app-panel app-header">
        <div>
          <h4>UAlberta Course Prerequisites</h4>
        </div>
        <SearchBar
          initialValue={selectedCourseCode}
          onSelectCourse={(courseCode) => navigate(`/graph/${formatCourseCodeForRoute(courseCode)}`)}
        />
      </article>

      <Controls
        maxDepth={maxDepth}
        includeCoreqs={includeCoreqs}
        onMaxDepthChange={setMaxDepth}
        onIncludeCoreqsChange={setIncludeCoreqs}

      />

      {isLoading ? <div className="app-banner">Loading graph data...</div> : null}
      {error ? <div className="app-banner app-banner-error">{error}</div> : null}

      <article className="app-panel app-graph-panel">
        <div className="graph-legend-overlay">
          <Legend />
        </div>
        <GraphCanvas
          graph={graph}
        />
      </article>
    </main>
  )
}
