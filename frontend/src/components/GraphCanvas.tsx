import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch'
import { buildHierarchy } from '../lib/buildHierarchy'
import { computeLayout } from '../lib/computeLayout'
import type { GraphResponse, PositionedNode } from '../types/graph'
import { CourseNode } from './CourseNode'
import { EdgePath } from './EdgePath'
import { GroupNode } from './GroupNode'

interface GraphCanvasProps {
  graph: GraphResponse | null
}

export interface GraphCanvasHandle {
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
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

export const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas(
  { graph }: GraphCanvasProps,
  ref,
) {
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourseDetails | null>(null)
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null)
  const layout = useMemo(() => {
    if (!graph) {
      return null
    }

    const hierarchy = buildHierarchy(graph)
    return computeLayout(hierarchy)
  }, [graph])

  useImperativeHandle(ref, () => ({
    zoomIn: () => transformRef.current?.zoomIn(0.2),
    zoomOut: () => transformRef.current?.zoomOut(0.2),
    resetView: () => transformRef.current?.resetTransform(),
  }))

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
    <div className="graph-canvas">
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.45}
        maxScale={2.4}
        centerOnInit
        limitToBounds={false}
        doubleClick={{ disabled: true }}
        wheel={{ step: 0.12, activationKeys: ['Control'] }}
        panning={{
          excluded: ['.course-node', '.course-popover', '.graph-legend'],
        }}
      >
        <TransformComponent
          wrapperClass="graph-transform-wrapper"
          contentClass="graph-transform-content"
        >
          <svg
            width={canvasWidth}
            height={canvasHeight}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`Prerequisite graph for ${currentGraph.rootCourse.code}`}
            className="graph-canvas-svg"
            onClick={() => setSelectedCourse(null)}
          >
            <rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#ffffff" />
            <g transform={`translate(${graphOffsetX}, ${graphOffsetY})`}>
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
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
})
