import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GraphCanvas } from '../components/GraphCanvas'
import { SearchBar } from '../components/SearchBar'
import { useCourseGraph } from '../hooks/useCourseGraph'
import { formatCourseCodeForDisplay, formatCourseCodeForRoute } from '../lib/courseCode'

const COURSE_DEPTH_OPTIONS = [1, 2, 3, 4]

export function GraphPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const [showHelp, setShowHelp] = useState(false)
  const [isDepthMenuOpen, setIsDepthMenuOpen] = useState(false)
  const depthFilterRef = useRef<HTMLDivElement | null>(null)
  const helpRef = useRef<HTMLDivElement | null>(null)
  const {
    selectedCourseCode,
    graph,
    error,
    maxDepth,
    includeCoreqs,
    setSelectedCourseCode,
    setMaxDepth,
    setIncludeCoreqs,
  } = useCourseGraph(formatCourseCodeForDisplay(code))

  useEffect(() => {
    setSelectedCourseCode(formatCourseCodeForDisplay(code))
  }, [code, setSelectedCourseCode])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!depthFilterRef.current?.contains(event.target as Node)) {
        setIsDepthMenuOpen(false)
      }

      if (!helpRef.current?.contains(event.target as Node)) {
        setShowHelp(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [])

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-stack">
          <div ref={helpRef} className="app-topbar-links">
            <a
              href="https://github.com/judxyz/ua-prereq"
              target="_blank"
              rel="noreferrer"
              className="topbar-link topbar-github-link"
            >
              Github
              <span className="topbar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M8 5H5v14h14v-3" />
                  <path d="M11 5h8v8" />
                  <path d="M10 14 19 5" />
                </svg>
              </span>
            </a>
            <button
              type="button"
              className="topbar-link topbar-help"
              aria-expanded={showHelp}
              aria-controls="help-popover"
              onClick={() => setShowHelp((open) => !open)}
            >
              How to use
            </button>
            {showHelp ? (
              <section id="help-popover" className="help-popover">
                <p>Use the search bar to map a course, scroll to zoom, drag the canvas to pan, and click a course node to open its description.</p>
              </section>
            ) : null}
          </div>

          <section className="app-topbar-shell">
            <div className="app-topbar-left">
              <h1 className="app-title">UofA Course Graph </h1>
              <h3 className="app-subtitle">Search for a course: </h3>
              <SearchBar
                initialValue={selectedCourseCode}
                onSelectCourse={(courseCode) => navigate(`/graph/${formatCourseCodeForRoute(courseCode)}`)}
              />
              <div ref={depthFilterRef} className="depth-filter">
                <span id="depth-filter-label" className="depth-filter-label">
                  Prerequisite depth:
                </span>
                <button
                  type="button"
                  className="depth-filter-button"
                  aria-labelledby="depth-filter-label"
                  aria-haspopup="listbox"
                  aria-expanded={isDepthMenuOpen}
                  onClick={() => setIsDepthMenuOpen((open) => !open)}
                >
                  {maxDepth === 1 ? '1 level' : `${maxDepth} levels`}
                </button>
                {isDepthMenuOpen ? (
                  <div className="depth-filter-menu" role="listbox" aria-labelledby="depth-filter-label">
                    {COURSE_DEPTH_OPTIONS.map((depth) => (
                      <button
                        key={depth}
                        type="button"
                        className={`depth-filter-option${depth === maxDepth ? ' depth-filter-option--active' : ''}`}
                        role="option"
                        aria-selected={depth === maxDepth}
                        onClick={() => {
                          setMaxDepth(depth)
                          setIsDepthMenuOpen(false)
                        }}
                      >
                        {depth === 1 ? '1 level' : `${depth} levels`}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <label className="coreq-toggle">
                <input
                  type="checkbox"
                  checked={includeCoreqs}
                  onChange={(event) => setIncludeCoreqs(event.target.checked)}
                />
                <span>Display corequisites</span>
              </label>
            </div>
          </section>
        </div>
      </header>

      {error ? <div className="app-status app-status-error" role="alert">{error}</div> : null}

      <section className="graph-section">
        <GraphCanvas graph={graph} />
      </section>
    </main>
  )
}
