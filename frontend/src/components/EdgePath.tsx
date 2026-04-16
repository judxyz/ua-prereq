import type { LayoutedLink } from '../types/graph'

interface EdgePathProps {
  link: LayoutedLink
}

export function EdgePath({ link }: EdgePathProps) {
  const midY = (link.source.y + link.target.y) / 2
  const path = [
    `M ${link.source.y} ${link.source.x}`,
    `C ${midY} ${link.source.x}, ${midY} ${link.target.x}, ${link.target.y} ${link.target.x}`,
  ].join(' ')

  const isCoreq = link.relationType === 'COREQ'

  return (
    <path
      d={path}
      fill="none"
      stroke={isCoreq ? '#059669' : '#94a3b8'}
      strokeDasharray={isCoreq ? '8 4' : undefined}
      strokeWidth={2}
    />
  )
}
