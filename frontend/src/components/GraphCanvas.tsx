import { useEffect, useMemo, useState } from 'react'
import { buildHierarchy } from '../lib/buildHierarchy'
import { computeLayout } from '../lib/computeLayout'
import type { GraphResponse, PositionedLink, PositionedNode } from '../types/graph'
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
  title: string
  description: string
  catalogUrl: string
}

function getCatalogUrl(subject: string, number: string | number) {
  return `https://apps.ualberta.ca/catalogue/course/${subject.toLowerCase()}/${String(number).toLowerCase()}`
}

function getEdgeVariant(
  link: PositionedLink,
  nodeLookup: Map<string, PositionedNode>,
): 'and' | 'or' | 'coreq' | 'default' {
  if (link.relationType === 'COREQ') {
    return 'coreq'
  }

  const sourceNode = nodeLookup.get(link.sourceId)
  const targetNode = nodeLookup.get(link.targetId)
  const groupNode =
    sourceNode?.type === 'group'
      ? sourceNode
      : targetNode?.type === 'group'
        ? targetNode
        : null

  if (!groupNode) {
    return 'default'
  }

  if (groupNode.data.groupType === 'ALL_OF') {
    return 'and'
  }

  if (groupNode.data.groupType === 'ANY_OF') {
    return 'or'
  }

  if (groupNode.data.groupType === 'COREQ') {
    return 'coreq'
  }

  return 'default'
}

export function GraphCanvas({ graph }: GraphCanvasProps) {
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourseDetails | null>(null)
  const layout = useMemo(() => {
    if (!graph) {
      return null
    }

    const hierarchy = buildHierarchy(graph)
    return computeLayout(hierarchy)
  }, [graph])

  const nodeLookup = useMemo(
    () => new Map((layout?.nodes ?? []).map((node) => [node.id, node])),
    [layout],
  )

  useEffect(() => {
    setSelectedCourse(null)
  }, [graph])

  if (!graph) {
    return (
      <div className="graph-empty">
        <p>Search for a course to display its prerequisite graph.</p>
      </div>
    )
  }

  if (!layout) {
    return (
      <div className="graph-empty">
        <p>Unable to compute a layout for this graph.</p>
      </div>
    )
  }

  const currentGraph = graph
  const canvasWidth = Math.max(layout.width + 80, 840)
  const canvasHeight = Math.max(layout.height + 60, 420)
  const popupWidth = 260
  const popupHeight = 210

  function handleSelectCourse(node: PositionedNode) {
    if (node.type !== 'course') {
      return
    }

    const isRootCourse = node.data.courseId === currentGraph.rootCourse.id
    const description = isRootCourse
      ? currentGraph.rootCourse.description ?? 'No description available.'
      : 'Description unavailable for this prerequisite node in the current graph data.'

    setSelectedCourse({
      anchorX: node.x,
      anchorY: node.y,
      code: node.data.code,
      title: node.data.title,
      description,
      catalogUrl:
        isRootCourse && currentGraph.rootCourse.catalogUrl
          ? currentGraph.rootCourse.catalogUrl
          : getCatalogUrl(node.data.subject, node.data.number),
    })
  }

  return (
    <div className="graph-frame">
      <div className="graph-scroll">
        <svg
          width={canvasWidth}
          height={canvasHeight}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="graph-canvas-svg"
          role="img"
          aria-label={`Prerequisite graph for ${currentGraph.rootCourse.code}`}
          onClick={() => setSelectedCourse(null)}
        >
          <rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#ffffff" />
          {layout.links.map((link) => (
            <EdgePath
              key={link.id}
              link={link}
              variant={getEdgeVariant(link, nodeLookup)}
            />
          ))}
          {layout.nodes.map((node) =>
            node.type === 'course' ? (
              <CourseNode key={node.id} node={node} onSelectCourse={handleSelectCourse} />
            ) : (
              <GroupNode key={node.id} node={node} />
            ),
          )}
          {selectedCourse ? (() => {
            const placeRight = selectedCourse.anchorX + 76 + popupWidth <= canvasWidth - 16
            const popupX = placeRight
              ? selectedCourse.anchorX + 76
              : Math.max(16, selectedCourse.anchorX - popupWidth - 76)
            const popupY = Math.max(
              16,
              Math.min(selectedCourse.anchorY - 44, canvasHeight - popupHeight - 16),
            )
            const connectorStartX = placeRight
              ? selectedCourse.anchorX + 62
              : selectedCourse.anchorX - 62
            const connectorEndX = placeRight ? popupX : popupX + popupWidth
            const connectorPath = `M ${connectorStartX} ${selectedCourse.anchorY} L ${connectorEndX} ${selectedCourse.anchorY}`

            return (
              <g className="course-popup-layer">
                <path className="course-popup-connector" d={connectorPath} />
                <foreignObject
                  x={popupX}
                  y={popupY}
                  width={popupWidth}
                  height={popupHeight}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="course-popup">
                    <button
                      type="button"
                      className="course-popup-close"
                      aria-label="Close course details"
                      onClick={() => setSelectedCourse(null)}
                    >
                      x
                    </button>
                    <h3>{selectedCourse.code}</h3>
                    <p className="course-popup-title">{selectedCourse.title}</p>
                    <p className="course-popup-description">{selectedCourse.description}</p>
                    <a
                      href={selectedCourse.catalogUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="course-popup-link"
                    >
                      See catalog
                    </a>
                  </div>
                </foreignObject>
              </g>
            )
          })() : null}
        </svg>
      </div>
    </div>
  )
}
