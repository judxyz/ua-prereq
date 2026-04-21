import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GraphCanvas } from '../components/GraphCanvas'
import { SearchBar } from '../components/SearchBar'
import { useCourseGraph } from '../hooks/useCourseGraph'
import { formatCourseCodeForDisplay, formatCourseCodeForRoute } from '../lib/courseCode'

export function GraphPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const [showHelp, setShowHelp] = useState(false)
  const { selectedCourseCode, graph, isLoading, error, setSelectedCourseCode } = useCourseGraph(
    formatCourseCodeForDisplay(code),
  )

  useEffect(() => {
    setSelectedCourseCode(formatCourseCodeForDisplay(code))
  }, [code, setSelectedCourseCode])

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-left">
          <SearchBar
            initialValue={selectedCourseCode}
            onSelectCourse={(courseCode) => navigate(`/graph/${formatCourseCodeForRoute(courseCode)}`)}
          />
        </div>

        <div className="app-topbar-links">
          <button
            type="button"
            className="topbar-link topbar-help"
            aria-expanded={showHelp}
            onClick={() => setShowHelp((open) => !open)}
          >
            How to use?
          </button>
          <a
            href="https://github.com/judxyz/ua-prereq"
            target="_blank"
            rel="noreferrer"
            className="topbar-link"
          >
            Github
          </a>
        </div>
      </header>

      {showHelp ? (
        <section className="help-popover">
          <p>Use the search bar to map a course, scroll to zoom, drag the canvas to pan, and click a course node to open its description.</p>
        </section>
      ) : null}

      {isLoading ? <div className="app-status" role="status">Loading course map...</div> : null}
      {error ? <div className="app-status app-status-error" role="alert">{error}</div> : null}

      <section className="graph-section">
        <GraphCanvas graph={graph} />
      </section>
    </main>
  )
}
