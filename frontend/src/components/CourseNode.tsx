import type { KeyboardEvent, MouseEvent } from 'react'
import type { PositionedNode } from '../types/graph'

interface CourseNodeProps {
  node: PositionedNode
  onSelectCourse: (node: PositionedNode) => void
}

export function CourseNode({ node, onSelectCourse }: CourseNodeProps) {
  if (node.type !== 'course') {
    return null
  }

  const course = node.data

  function handleClick(event: MouseEvent<SVGGElement>) {
    event.stopPropagation()
    onSelectCourse(node)
  }

  function handleKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      onSelectCourse(node)
    }
  }

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      className={node.isReference ? 'course-node course-node--reference' : 'course-node'}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <rect
        className="course-node__box"
        x={-62}
        y={-28}
        width={124}
        height={56}
      />
      <text x={0} y={-3} textAnchor="middle" className="course-node__code">
        {course.code}
      </text>
      <text x={0} y={15} textAnchor="middle" className="course-node__title">
        View course
      </text>
      <title>
        {node.isReference
          ? `${course.code}: ${course.title} (reference)`
          : `${course.code}: ${course.title}`}
      </title>
    </g>
  )
}
