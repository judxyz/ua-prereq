import type { PositionedNode } from '../types/graph'

interface GroupNodeProps {
  node: PositionedNode
}

export function GroupNode({ node }: GroupNodeProps) {
  if (node.type !== 'group') {
    return null
  }

  const group = node.data
  const label =
    group.groupType

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      {group.groupType === 'ANY_OF' ? (
        <ellipse className="group-node__shape group-node__shape--or" cx={0} cy={0} rx={28} ry={16} />
      ) : group.groupType === 'ALL_OF' ? (
        <path className="group-node__shape group-node__shape--and" d="M 0 -18 L 18 0 L 0 18 L -18 0 Z" />
      ) : group.groupType === 'COREQ' ? (
        <circle className="group-node__shape group-node__shape--coreq" cx={0} cy={0} r={12} />
      ) : (
        <rect className="group-node__shape group-node__shape--unknown" x={-12} y={-12} width={24} height={24} />
      )}
      {label ? (
        <text className="group-node__label" x={0} y={4} textAnchor="middle">
          {label}
        </text>
      ) : null}
      <title>{group.groupType}</title>
    </g>
  )
}
