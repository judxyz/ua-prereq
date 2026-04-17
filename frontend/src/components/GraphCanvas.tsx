import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { buildHierarchy } from '../lib/buildHierarchy'
import { computeLayout } from '../lib/computeLayout'
import type { PositionedNode, GraphResponse } from '../types/graph'
import { CourseNode } from './CourseNode'
import { EdgePath } from './EdgePath'
import { GroupNode } from './GroupNode'

interface GraphCanvasProps {
  graph: GraphResponse | null
}

interface SelectedCourseDetails {
  anchorX: number
  anchorY: number
  code: string
  subject: string
  number: string | number
  title: string
  parseStatus: string
  description: string | null
  otherNotes: string | null
  rawPrerequisiteText: string | null
  rawCorequisiteText: string | null
  catalogUrl: string
}

function getCatalogUrl(subject: string, number: string | number) {
  return `https://apps.ualberta.ca/catalogue/course/${subject.toLowerCase()}/${String(number).toLowerCase()}`
}

export function GraphCanvas({
  graph,
}: GraphCanvasProps) {
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourseDetails | null>(null)
  const [viewScale, setViewScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStateRef = useRef<{
    startPanX: number
    startPanY: number
    startClientX: number
    startClientY: number
  } | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const layout = useMemo(() => {
    if (!graph) {
      return null
    }

    const hierarchy = buildHierarchy(graph)
    return computeLayout(hierarchy)
  }, [graph])

  if (!graph) {
    return (
      <div className="graph-canvas graph-empty">
        <p>Select a course to load its prerequisite tree.</p>
      </div>
    )
  }

  if (!layout) {
    return (
      <div className="graph-canvas graph-empty">
        <p>Unable to compute a layout for this graph.</p>
      </div>
    )
  }

  const currentGraph = graph
  const canvasWidth = Math.max(layout.width + 220, 1120)
  const canvasHeight = Math.max(layout.height + 180, 780)
  const popoverWidth = 320
  const popoverHeight = 236
  const graphOffsetX = Math.max(24, (canvasWidth - layout.width) / 2)
  const graphOffsetY = Math.max(24, (canvasHeight - layout.height) / 2)

  function getSvgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current

    if (!svg) {
      return null
    }

    const rect = svg.getBoundingClientRect()

    if (rect.width === 0 || rect.height === 0) {
      return null
    }

    const viewBox = svg.viewBox.baseVal
    const scaleX = viewBox.width / rect.width
    const scaleY = viewBox.height / rect.height

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    if (!event.ctrlKey) {
      return
    }

    event.preventDefault()

    const point = getSvgPoint(event.clientX, event.clientY)
    const zoomFactor = event.deltaY < 0 ? 1.12 : 0.9

    setViewScale((currentScale) => {
      const nextScale = Math.max(0.45, Math.min(2.4, currentScale * zoomFactor))

      if (!point || nextScale === currentScale) {
        return nextScale
      }

      const contentX = (point.x - graphOffsetX - pan.x) / currentScale
      const contentY = (point.y - graphOffsetY - pan.y) / currentScale

      setPan({
        x: point.x - graphOffsetX - contentX * nextScale,
        y: point.y - graphOffsetY - contentY * nextScale,
      })

      return nextScale
    })
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    const target = event.target as Element

    if (
      target.closest('.course-node') ||
      target.closest('.course-popover') ||
      target.closest('.group-node')
    ) {
      return
    }

    dragStateRef.current = {
      startPanX: pan.x,
      startPanY: pan.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
    }

    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const dragState = dragStateRef.current

    if (!dragState) {
      return
    }

    setPan({
      x: dragState.startPanX + (event.clientX - dragState.startClientX),
      y: dragState.startPanY + (event.clientY - dragState.startClientY),
    })
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (dragStateRef.current) {
      dragStateRef.current = null
      setIsDragging(false)
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleSelectCourse(node: PositionedNode) {
    if (node.type !== 'course') {
      return
    }

    const isRootCourse = node.data.courseId === currentGraph.rootCourse.id

    setSelectedCourse({
      anchorX: node.x,
      anchorY: node.y,
      code: node.data.code,
      subject: node.data.subject,
      number: node.data.number,
      title: node.data.title,
      parseStatus: node.data.parseStatus,
      description: isRootCourse ? currentGraph.rootCourse.description : null,
      otherNotes: isRootCourse ? currentGraph.rootCourse.otherNotes : null,
      rawPrerequisiteText: isRootCourse ? currentGraph.rawPrerequisiteText : null,
      rawCorequisiteText: isRootCourse ? currentGraph.rawCorequisiteText : null,
      catalogUrl:
        isRootCourse && currentGraph.rootCourse.catalogUrl
          ? currentGraph.rootCourse.catalogUrl
          : getCatalogUrl(node.data.subject, node.data.number),
    })
  }

  return (
    <>
      <div className="graph-canvas">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          preserveAspectRatio="xMidYMin meet"
          role="img"
          aria-label={`Prerequisite graph for ${currentGraph.rootCourse.code}`}
          className={isDragging ? 'graph-canvas-svg is-panning' : 'graph-canvas-svg'}
          onClick={() => setSelectedCourse(null)}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#ffffff" />
          <g transform={`translate(${graphOffsetX + pan.x}, ${graphOffsetY + pan.y}) scale(${viewScale})`}>
            {layout.links.map((link) => (
              <EdgePath key={link.id} link={link} />
            ))}
            {layout.nodes.map((node) =>
              node.type === 'course' ? (
                <CourseNode key={node.id} node={node} onSelectCourse={handleSelectCourse} />
              ) : (
                <GroupNode key={node.id} node={node} />
              ),
            )}
            {selectedCourse ? (() => {
              const placeRight =
                selectedCourse.anchorX + 118 + popoverWidth <=
                canvasWidth - graphOffsetX - 16
              const rawX = placeRight
                ? selectedCourse.anchorX + 118
                : selectedCourse.anchorX - popoverWidth - 118
              const popoverX = Math.max(
                -graphOffsetX + 16,
                Math.min(rawX, canvasWidth - graphOffsetX - popoverWidth - 16),
              )
              const popoverY = Math.max(
                -graphOffsetY + 16,
                Math.min(
                  selectedCourse.anchorY - 44,
                  canvasHeight - graphOffsetY - popoverHeight - 16,
                ),
              )
              const attachX = placeRight ? popoverX : popoverX + popoverWidth
              const attachY = Math.max(
                popoverY + 28,
                Math.min(selectedCourse.anchorY, popoverY + popoverHeight - 28),
              )
              const sourceX = placeRight ? selectedCourse.anchorX + 98 : selectedCourse.anchorX - 98
              const connectorPath = [
                `M ${sourceX} ${selectedCourse.anchorY}`,
                `C ${sourceX + (placeRight ? 18 : -18)} ${selectedCourse.anchorY},`,
                `${attachX + (placeRight ? -18 : 18)} ${attachY},`,
                `${attachX} ${attachY}`,
              ].join(' ')

              return (
                <g className="course-popover-layer">
                  <path className="course-popover-connector" d={connectorPath} />
                  <foreignObject
                    x={popoverX}
                    y={popoverY}
                    width={popoverWidth}
                    height={popoverHeight}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="course-popover">
                      <div className="course-popover-header">
                        <div>
                          <h3>{selectedCourse.code}</h3>
                          <p>{selectedCourse.title}</p>
                        </div>
                        <button
                          type="button"
                          className="course-popover-close"
                          aria-label="Close course details"
                          onClick={() => setSelectedCourse(null)}
                        >
                          x
                        </button>
                      </div>
                      <div className="course-popover-meta">
                        <span>Parse status: {selectedCourse.parseStatus}</span>
                      </div>
                      {selectedCourse.description ? (
                        <section className="course-popover-section">
                          <strong>Description</strong>
                          <p>{selectedCourse.description}</p>
                        </section>
                      ) : null}
                      {selectedCourse.rawPrerequisiteText ? (
                        <section className="course-popover-section">
                          <strong>Prerequisites</strong>
                          <p>{selectedCourse.rawPrerequisiteText}</p>
                        </section>
                      ) : null}
                      {selectedCourse.rawCorequisiteText ? (
                        <section className="course-popover-section">
                          <strong>Corequisites</strong>
                          <p>{selectedCourse.rawCorequisiteText}</p>
                        </section>
                      ) : null}
                      {!selectedCourse.description &&
                      !selectedCourse.rawPrerequisiteText &&
                      !selectedCourse.rawCorequisiteText &&
                      !selectedCourse.otherNotes ? (
                        <section className="course-popover-section">
                          <p>Course summary information is limited for prerequisite nodes.</p>
                        </section>
                      ) : null}
                      {selectedCourse.otherNotes ? (
                        <section className="course-popover-section">
                          <strong>Notes</strong>
                          <p>{selectedCourse.otherNotes}</p>
                        </section>
                      ) : null}
                      <div className="course-popover-actions">
                        <a
                          href={selectedCourse.catalogUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="course-popover-link"
                        >
                          <span>Course page</span>
                          <span aria-hidden="true">→</span>
                        </a>
                      </div>
                    </div>
                  </foreignObject>
                </g>
              )
            })() : null}
          </g>
        </svg>
      </div>
    </>
  )
}
