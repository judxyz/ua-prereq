import { useEffect, type CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controls } from '../components/Controls'
import { GraphCanvas } from '../components/GraphCanvas'
import { Legend } from '../components/Legend'
import { SearchBar } from '../components/SearchBar'
import { Sidebar } from '../components/Sidebar'
import { useCourseGraph } from '../hooks/useCourseGraph'
import { useZoomPan } from '../hooks/useZoomPan'
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
  const zoomPan = useZoomPan()
  const statusBannerStyle = {
    padding: '0.85rem 1rem',
    borderRadius: '8px',
  } satisfies CSSProperties

  useEffect(() => {
    setSelectedCourseCode(formatCourseCodeForDisplay(code))
  }, [code, setSelectedCourseCode])

  return (
    <main className="container" style={{ display: 'grid', gap: '1.25rem', padding: '1.5rem 0 2rem' }}>
      <article style={{ margin: 0 }}>
        <div>
          <p
            style={{
              marginBottom: '0.35rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            UAlberta CMPUT Prerequisite Graph System
          </p>
          <h1>CMPUT prerequisite graph</h1>
          <p style={{ maxWidth: '68ch', marginTop: '0.6rem' }}>
            Search for a course to inspect its prerequisite structure as a tree of courses and
            logic groups.
          </p>
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
        onZoomIn={zoomPan.zoomIn}
        onZoomOut={zoomPan.zoomOut}
        onReset={zoomPan.reset}
      />

      <Legend />

      {isLoading ? (
        <div
          style={{
            ...statusBannerStyle,
            border: '1px solid #d6c06b',
            background: '#fff8dd',
            color: '#5b4a0d',
          }}
        >
          Loading graph data...
        </div>
      ) : null}
      {error ? (
        <div
          style={{
            ...statusBannerStyle,
            border: '1px solid #d8b1aa',
            background: '#fff4f2',
            color: '#7a2d22',
          }}
        >
          {error}
        </div>
      ) : null}

      <section className="grid" style={{ alignItems: 'start', gap: '1.25rem' }}>
        <article style={{ margin: 0, padding: '0.75rem' }}>
          <GraphCanvas
            graph={graph}
            scale={zoomPan.scale}
            translateX={zoomPan.translateX}
            translateY={zoomPan.translateY}
          />
        </article>
        <Sidebar graph={graph} selectedMaxDepth={maxDepth} />
      </section>
    </main>
  )
}
