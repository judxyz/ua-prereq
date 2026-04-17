import type { PositionedLink } from '../types/graph'

interface EdgePathProps {
  link: PositionedLink
}

export function EdgePath({ link }: EdgePathProps) {
  const path = `M ${link.source.x} ${link.source.y} L ${link.target.x} ${link.target.y}`

  const isCoreq = link.relationType === 'COREQ'

  return (
    <path
      className={isCoreq ? 'edge-path edge-path--coreq' : 'edge-path edge-path--prereq'}
      d={path}
    />
  )
}
