import type { PositionedNode } from '../types/graph'

interface CourseNodeProps {
  node: PositionedNode
}

function getStatusColor(parseStatus: string) {
  switch (parseStatus) {
    case 'parsed':
      return '#2f855a'
    case 'partial':
      return '#b7791f'
    case 'unparsed':
      return '#64748b'
    default:
      return '#4a5568'
  }
}

function getCatalogUrl(subject: string, number: string | number) {
  return `https://apps.ualberta.ca/catalogue/course/${subject.toLowerCase()}/${String(number).toLowerCase()}`
}

export function CourseNode({ node }: CourseNodeProps) {
  if (node.type !== 'course') {
    return null
  }

  const course = node.data
  const statusColor = getStatusColor(course.parseStatus)
  const catalogUrl = getCatalogUrl(course.subject, course.number)

  return (
    <a href={catalogUrl} target="_blank" rel="noreferrer" className="graph-link">
      <g
        transform={`translate(${node.x}, ${node.y})`}
        className={node.isReference ? 'course-node course-node--reference' : 'course-node'}
      >
        <rect
          className="course-node__box"
          x={-98}
          y={-30}
          width={196}
          height={60}
          rx={14}
        />
        <circle cx={-74} cy={0} r={6} fill={statusColor} />
        <text x={-60} y={-5} className="course-node__code">
          {course.code}
        </text>
        <text x={-60} y={14} className="course-node__title">
          {course.title}
        </text>
        <title>
          {node.isReference
            ? `${course.code}: ${course.title} (reference)`
            : `${course.code}: ${course.title}`}
        </title>
      </g>
    </a>
  )
}
