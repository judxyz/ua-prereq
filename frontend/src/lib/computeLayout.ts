import { hierarchy as d3Hierarchy, tree as d3Tree } from 'd3'
import type {
  LayoutConfig,
  LayoutHierarchyNode,
  LayoutResult,
  PositionedLink,
  PositionedNode,
} from '../types/graph'

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  levelGap: 160,
  siblingGap: 220,
  marginX: 120,
  marginY: 90,
}

export function computeLayout(
  root: LayoutHierarchyNode,
  config: Partial<LayoutConfig> = {},
): LayoutResult {
  const layoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config }
  const hierarchyRoot = d3Hierarchy(root, (node) => node.children)
  const tree = d3Tree<LayoutHierarchyNode>().nodeSize([
    layoutConfig.siblingGap,
    layoutConfig.levelGap,
  ])
  const treeRoot = tree(hierarchyRoot)
  const descendants = treeRoot.descendants()

  const minX = Math.min(...descendants.map((node) => node.x), 0)
  const maxX = Math.max(...descendants.map((node) => node.x), 0)
  const maxY = Math.max(...descendants.map((node) => node.y), 0)

  const nodes: PositionedNode[] = descendants.map((node) => {
    const baseNode = {
      id: node.data.id,
      originalNodeId: node.data.originalNodeId,
      x: node.x - minX + layoutConfig.marginX,
      y: node.y + layoutConfig.marginY,
      depth: node.depth,
      isReference: node.data.isReference,
    }

    if (node.data.type === 'course') {
      return {
        ...baseNode,
        type: 'course',
        data: {
          ...node.data.data,
          depth: node.depth,
        },
      }
    }

    return {
      ...baseNode,
      type: 'group',
      data: {
        ...node.data.data,
        depth: node.depth,
      },
    }
  })

  const nodeLookup = new Map(nodes.map((node) => [node.id, node]))

  const links: PositionedLink[] = treeRoot.links().flatMap((link) => {
    const sourceNode = nodeLookup.get(link.source.data.id)
    const targetNode = nodeLookup.get(link.target.data.id)

    if (!sourceNode || !targetNode) {
      return []
    }

    return [
      {
        id: `${sourceNode.id}->${targetNode.id}`,
        sourceId: sourceNode.id,
        targetId: targetNode.id,
        source: {
          x: sourceNode.x,
          y: sourceNode.y,
        },
        target: {
          x: targetNode.x,
          y: targetNode.y,
        },
        relationType: link.target.data.relationTypeFromParent ?? 'PREREQ',
      },
    ]
  })

  return {
    nodes,
    links,
    width: maxX - minX + layoutConfig.siblingGap + layoutConfig.marginX * 2,
    height: maxY + layoutConfig.levelGap + layoutConfig.marginY * 2,
  }
}
