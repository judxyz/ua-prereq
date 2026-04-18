import type { PositionedLink } from '../types/graph'

interface EdgePathProps {
  link: PositionedLink
  variant: 'and' | 'or' | 'coreq' | 'default'
}

export function EdgePath({ link, variant }: EdgePathProps) {
  const deltaX = link.target.x - link.source.x
  const deltaY = link.target.y - link.source.y
  const radius = Math.min(5, Math.abs(deltaY) / 2, Math.abs(deltaX) / 2)
  const directionX = deltaX >= 0 ? 1 : -1
  const midY = link.source.y + deltaY / 2
  const firstVerticalEndY = deltaY === 0 ? link.source.y : midY 
  const secondVerticalStartY = deltaY === 0 ? link.target.y : midY 
  const horizontalTurnStartX = link.source.x + radius * directionX
  const horizontalTurnEndX = link.target.x - radius * directionX
  const path = deltaY === 0
    ? `M ${link.source.x} ${link.source.y} L ${link.target.x} ${link.target.y}`
    : [
        `M ${link.source.x} ${link.source.y}`,
        `L ${link.source.x} ${firstVerticalEndY}`,
        `Q ${link.source.x} ${midY} ${horizontalTurnStartX} ${midY}`,
        `L ${horizontalTurnEndX} ${midY}`,
        `Q ${link.target.x} ${midY} ${link.target.x} ${secondVerticalStartY}`,
        `L ${link.target.x} ${link.target.y}`,
      ].join(' ')

  return (
    <path
      className={`edge-path edge-path--${variant}`}
      d={path}
    />
  )
}
