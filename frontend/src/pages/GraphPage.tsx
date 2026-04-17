import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controls } from '../components/Controls'
import { GraphCanvas, type GraphCanvasHandle } from '../components/GraphCanvas'
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
  const graphCanvasRef = useRef<GraphCanvasHandle | null>(null)

  useEffect(() => {
    setSelectedCourseCode(formatCourseCodeForDisplay(code))
  }, [code, setSelectedCourseCode])

  return (
    <main className="container app-shell">
      <section className="app-top-section">
        <div className="app-top-bar">
          <div className="app-top-header">
            <h4>UAlberta Course Prerequisites</h4>
          </div>
          <SearchBar
            initialValue={selectedCourseCode}
            onSelectCourse={(courseCode) => navigate(`/graph/${formatCourseCodeForRoute(courseCode)}`)}
          />
          <Controls
            maxDepth={maxDepth}
            includeCoreqs={includeCoreqs}
            onMaxDepthChange={setMaxDepth}
            onIncludeCoreqsChange={setIncludeCoreqs}
            onZoomIn={() => graphCanvasRef.current?.zoomIn()}
            onZoomOut={() => graphCanvasRef.current?.zoomOut()}
            onResetView={() => graphCanvasRef.current?.resetView()}
          />
        </div>

        {isLoading ? <div className="app-banner">Loading graph data...</div> : null}
        {error ? <div className="app-banner app-banner-error">{error}</div> : null}
      </section>

      <article className="app-panel app-graph-panel">
        <div className="graph-legend-overlay">
          <Legend />
        </div>
        <GraphCanvas ref={graphCanvasRef} graph={graph} />
      </article>
    </main>
  )
}
