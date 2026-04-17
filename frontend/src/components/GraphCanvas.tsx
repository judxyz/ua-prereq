import { useMemo } from 'react'
import { buildHierarchy } from '../lib/buildHierarchy'
import { computeLayout } from '../lib/computeLayout'
import type { GraphResponse } from '../types/graph'
import { CourseNode } from './CourseNode'
import { EdgePath } from './EdgePath'
import { GroupNode } from './GroupNode'

interface GraphCanvasProps {
  graph: GraphResponse | null
  scale: number
  translateX: number
  translateY: number
}

export function GraphCanvas({
  graph,
  scale,
  translateX,
  translateY,
}: GraphCanvasProps) {
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

  const canvasWidth = Math.max(layout.width + 80, 900)
  const canvasHeight = Math.max(layout.height + 80, 720)

  return (
    <div className="graph-canvas">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        preserveAspectRatio="xMidYMin meet"
        role="img"
        aria-label={`Prerequisite graph for ${graph.rootCourse.code}`}
      >
        <rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#ffffff" />
        <g transform={`translate(${translateX}, ${translateY}) scale(${scale})`}>
          {layout.links.map((link) => (
            <EdgePath key={link.id} link={link} />
          ))}
          {layout.nodes.map((node) =>
            node.type === 'course' ? (
              <CourseNode key={node.id} node={node} />
            ) : (
              <GroupNode key={node.id} node={node} />
            ),
          )}
        </g>
      </svg>
    </div>
  )
}
