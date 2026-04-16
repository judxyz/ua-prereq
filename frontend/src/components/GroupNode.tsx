import type { GroupType, LayoutedNode } from '../types/graph'

interface GroupNodeProps {
  node: LayoutedNode
}

const GROUP_COLORS: Record<GroupType, { fill: string; stroke: string }> = {
  ANY_OF: { fill: '#fff7ed', stroke: '#dd6b20' },
  ALL_OF: { fill: '#eff6ff', stroke: '#2563eb' },
  COREQ: { fill: '#ecfdf5', stroke: '#059669' },
  UNKNOWN: { fill: '#f8fafc', stroke: '#64748b' },
}

export function GroupNode({ node }: GroupNodeProps) {
  if (node.data.kind !== 'group') {
    return null
  }

  const colors = GROUP_COLORS[node.data.groupType]
  const label = node.data.displayLabel ?? node.data.label

  return (
    <g transform={`translate(${node.y}, ${node.x})`}>
      <rect
        x={-52}
        y={-18}
        width={104}
        height={36}
        rx={18}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={1.5}
      />
      <text textAnchor="middle" y={5} fontSize={12} fontWeight={700} fill={colors.stroke}>
        {label}
      </text>
      <title>{`${node.data.groupType}: ${label}`}</title>
    </g>
  )
}
