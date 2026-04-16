import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controls } from '../components/Controls'
import { GraphCanvas } from '../components/GraphCanvas'
import { Legend } from '../components/Legend'
import { SearchBar } from '../components/SearchBar'
import { Sidebar } from '../components/Sidebar'
import { useCourseGraph } from '../hooks/useCourseGraph'
import { useZoomPan } from '../hooks/useZoomPan'

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
  } = useCourseGraph(code.toUpperCase())
  const zoomPan = useZoomPan()

  useEffect(() => {
    setSelectedCourseCode(code.toUpperCase())
  }, [code, setSelectedCourseCode])

  return (
    <main className="page-shell graph-page">
      <section className="topbar">
        <div>
          <p className="eyebrow">Phase 4 Frontend Skeleton</p>
          <h1>Prerequisite Tree Viewer</h1>
        </div>
        <SearchBar
          initialValue={selectedCourseCode}
          onSelectCourse={(courseCode) => navigate(`/graph/${courseCode}`)}
        />
      </section>

      <Controls
        maxDepth={maxDepth}
        includeCoreqs={includeCoreqs}
        onMaxDepthChange={setMaxDepth}
        onIncludeCoreqsChange={setIncludeCoreqs}
        onZoomIn={zoomPan.zoomIn}
        onZoomOut={zoomPan.zoomOut}
        onReset={zoomPan.reset}
      />

      <Legend />

      {isLoading ? <div className="status-banner">Loading graph data...</div> : null}
      {error ? <div className="status-banner error">{error}</div> : null}

      <section className="graph-layout">
        <GraphCanvas
          graph={graph}
          scale={zoomPan.scale}
          translateX={zoomPan.translateX}
          translateY={zoomPan.translateY}
        />
        <Sidebar graph={graph} />
      </section>
    </main>
  )
}
