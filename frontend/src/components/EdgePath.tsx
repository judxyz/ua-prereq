import type { PositionedLink } from '../types/graph'

interface EdgePathProps {
  link: PositionedLink
}

export function EdgePath({ link }: EdgePathProps) {
  const midY = (link.source.y + link.target.y) / 2
  const path = [
    `M ${link.source.x} ${link.source.y}`,
    `C ${link.source.x} ${midY}, ${link.target.x} ${midY}, ${link.target.x} ${link.target.y}`,
  ].join(' ')

  const isCoreq = link.relationType === 'COREQ'

  return (
    <path
      className={isCoreq ? 'edge-path edge-path--coreq' : 'edge-path edge-path--prereq'}
      d={path}
    />
  )
}
