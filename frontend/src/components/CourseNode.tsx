import type { KeyboardEvent, MouseEvent } from 'react'
import type { PositionedNode } from '../types/graph'

interface CourseNodeProps {
  node: PositionedNode
  onSelectCourse: (node: PositionedNode) => void
}

function wrapTitle(title: string) {
  const words = title.trim().split(/\s+/)
  const lines: string[] = []
  let currentLine = ''
  const maxLength = 28

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word

    if (candidate.length <= maxLength) {
      currentLine = candidate
      continue
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    currentLine = word
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

export function CourseNode({ node, onSelectCourse }: CourseNodeProps) {
  if (node.type !== 'course') {
    return null
  }

  const course = node.data
  const titleLines = wrapTitle(course.title)
  const titleLineHeight = 12
  const titleBlockHeight = Math.max(titleLines.length, 1) * titleLineHeight
  const boxHeight = Math.max(80, 56 + titleBlockHeight)
  const boxY = -boxHeight / 2
  const textX = -60
  const contentTop = boxY + 22
  const codeY = contentTop
  const titleY = codeY + 18

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
        x={-78}
        y={boxY}
        width={196}
        height={boxHeight}
      />
      <text x={textX} y={codeY} className="course-node__code">
        {course.code}
      </text>
      <text x={textX} y={titleY} className="course-node__title">
        {titleLines.map((line, index) => (
          <tspan
            key={`${course.code}-title-${index}`}
            x={textX}
            dy={index === 0 ? 0 : titleLineHeight}
          >
            {line}
          </tspan>
        ))}
      </text>
      <title>
        {node.isReference
          ? `${course.code}: ${course.title} (reference)`
          : `${course.code}: ${course.title}`}
      </title>
    </g>
  )
}
