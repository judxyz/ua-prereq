import { hierarchy as d3Hierarchy, tree as d3Tree } from 'd3'
import type {
  LayoutConfig,
  LayoutHierarchyNode,
  LayoutResult,
  PositionedLink,
  PositionedNode,
} from '../types/graph'

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  levelGap: 126,
  siblingGap: 136,
  marginX: 64,
  marginY: 50,
}

function createVisualYMap(
  node: LayoutHierarchyNode,
  parentCourseLevel: number,
  levelGap: number,
  marginY: number,
  yMap: Map<string, number>,
) {
  const courseLevel = node.type === 'course' ? parentCourseLevel + 1 : parentCourseLevel
  const nextCourseLevel = node.type === 'course' ? courseLevel : parentCourseLevel

  if (node.type === 'course') {
    yMap.set(node.id, marginY + (courseLevel - 1) * levelGap)
  } else {
    yMap.set(node.id, marginY + (parentCourseLevel - 0.5) * levelGap)
  }

  for (const child of node.children) {
    createVisualYMap(child, nextCourseLevel, levelGap, marginY, yMap)
  }
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
  tree.separation((leftNode, rightNode) => {
    if (leftNode.parent === rightNode.parent) {
      return 1
    }

    return 1.15
  })
  const treeRoot = tree(hierarchyRoot)
  const descendants = treeRoot.descendants()
  const yMap = new Map<string, number>()
  createVisualYMap(root, 0, layoutConfig.levelGap, layoutConfig.marginY, yMap)

  const minX = Math.min(...descendants.map((node) => node.x), 0)
  const maxX = Math.max(...descendants.map((node) => node.x), 0)
  const rootX = treeRoot.x - minX + layoutConfig.marginX
  const leftSpan = rootX - layoutConfig.marginX
  const rightSpan = maxX - treeRoot.x
  const maxHorizontalSpan = Math.max(leftSpan, rightSpan)
  const width = maxHorizontalSpan * 2 + layoutConfig.marginX * 2
  const centerX = width / 2
  const xShift = centerX - rootX
  const maxY = Math.max(...descendants.map((node) => yMap.get(node.data.id) ?? layoutConfig.marginY), 0)

  const nodes: PositionedNode[] = descendants.map((node) => {
    const baseNode = {
      id: node.data.id,
      originalNodeId: node.data.originalNodeId,
      x: node.x - minX + layoutConfig.marginX + xShift,
      y: yMap.get(node.data.id) ?? layoutConfig.marginY,
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
    width,
    height: maxY + layoutConfig.levelGap + layoutConfig.marginY * 2,
  }
}
