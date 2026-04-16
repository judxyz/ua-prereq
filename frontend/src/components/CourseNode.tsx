import type { LayoutedNode } from '../types/graph'

interface CourseNodeProps {
  node: LayoutedNode
}

function getStatusColor(parseStatus: string) {
  switch (parseStatus.toUpperCase()) {
    case 'PARSED':
      return '#2f855a'
    case 'PARTIAL':
      return '#b7791f'
    case 'FAILED':
      return '#c53030'
    default:
      return '#4a5568'
  }
}

export function CourseNode({ node }: CourseNodeProps) {
  const { course } = node.data.kind === 'course' ? node.data : { course: null }

  if (!course) {
    return null
  }

  const statusColor = getStatusColor(course.parseStatus)

  return (
    <g transform={`translate(${node.y}, ${node.x})`}>
      <rect
        x={-90}
        y={-28}
        width={180}
        height={56}
        rx={14}
        fill="#ffffff"
        stroke="#cbd5e1"
        strokeWidth={1.5}
      />
      <circle cx={-68} cy={0} r={6} fill={statusColor} />
      <text x={-54} y={-4} fontSize={14} fontWeight={700} fill="#102a43">
        {course.code}
      </text>
      <text x={-54} y={14} fontSize={11} fill="#52606d">
        {course.title}
      </text>
      <title>{`${course.code}: ${course.title}`}</title>
    </g>
  )
}
