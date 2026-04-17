import type { GroupType, PositionedNode } from '../types/graph'

interface GroupNodeProps {
  node: PositionedNode
}

const GROUP_COLORS: Record<GroupType, { fill: string; stroke: string }> = {
  ANY_OF: { fill: '#fff7ed', stroke: '#dd6b20' },
  ALL_OF: { fill: '#eff6ff', stroke: '#2563eb' },
  COREQ: { fill: '#ecfdf5', stroke: '#059669' },
  UNKNOWN: { fill: '#f8fafc', stroke: '#64748b' },
}

export function GroupNode({ node }: GroupNodeProps) {
  if (node.type !== 'group') {
    return null
  }

  const group = node.data
  const colors = GROUP_COLORS[group.groupType]
  const label =
    group.groupType === 'COREQ' || group.label === 'requires'
      ? ''
      : group.displayLabel ?? group.label
  const hasLabel = label.length > 0
  const warningStroke = '#b45309'

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      {group.groupType === 'ANY_OF' ? (
        <path
          className="group-node__shape"
          d="M 0 -18 L 42 0 L 0 18 L -42 0 Z"
          fill={colors.fill}
          stroke={colors.stroke}
        />
      ) : (
        <rect
          className="group-node__shape"
          x={hasLabel ? -54 : -16}
          y={hasLabel ? -18 : -16}
          width={hasLabel ? 108 : 32}
          height={hasLabel ? 36 : 32}
          rx={group.groupType === 'ALL_OF' ? 8 : 12}
          fill={group.groupType === 'UNKNOWN' ? '#fef3c7' : colors.fill}
          stroke={group.groupType === 'UNKNOWN' ? warningStroke : colors.stroke}
          strokeDasharray={group.groupType === 'COREQ' ? '6 4' : undefined}
        />
      )}
      {group.groupType === 'UNKNOWN' && !hasLabel ? (
        <text textAnchor="middle" y={5} fontSize={14} fontWeight={700} fill={warningStroke}>
          ?
        </text>
      ) : null}
      {hasLabel ? (
        <text
          className="group-node__label"
          textAnchor="middle"
          y={5}
          fill={group.groupType === 'UNKNOWN' ? warningStroke : colors.stroke}
        >
          {label}
        </text>
      ) : null}
      <title>{label ? `${group.groupType}: ${label}` : group.groupType}</title>
    </g>
  )
}
