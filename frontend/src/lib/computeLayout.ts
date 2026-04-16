import { hierarchy as d3Hierarchy, tree as d3Tree } from 'd3'
import type { HierarchyNode, LayoutResult, LayoutedLink, LayoutedNode } from '../types/graph'

export interface ComputeLayoutOptions {
  nodeWidth?: number
  rowHeight?: number
  marginX?: number
  marginY?: number
}

const DEFAULT_OPTIONS: Required<ComputeLayoutOptions> = {
  nodeWidth: 240,
  rowHeight: 110,
  marginX: 80,
  marginY: 60,
}

export function computeLayout(
  rootNode: HierarchyNode,
  options: ComputeLayoutOptions = {},
): LayoutResult {
  const settings = { ...DEFAULT_OPTIONS, ...options }
  const hierarchyRoot = d3Hierarchy(rootNode, (node) => node.children)
  const layout = d3Tree<HierarchyNode>().nodeSize([settings.rowHeight, settings.nodeWidth])
  const treeRoot = layout(hierarchyRoot)
  const descendants = treeRoot.descendants()
  const minX = Math.min(...descendants.map((node) => node.x), 0)
  const maxX = Math.max(...descendants.map((node) => node.x), 0)
  const maxY = Math.max(...descendants.map((node) => node.y), 0)

  const nodes: LayoutedNode[] = descendants.map((node) => ({
    id: node.data.id,
    x: node.x - minX + settings.marginY,
    y: node.y + settings.marginX,
    depth: node.depth,
    data: node.data,
  }))

  const links: LayoutedLink[] = treeRoot.links().map((link) => ({
    id: `${link.source.data.id}->${link.target.data.id}`,
    source: {
      x: link.source.x - minX + settings.marginY,
      y: link.source.y + settings.marginX,
    },
    target: {
      x: link.target.x - minX + settings.marginY,
      y: link.target.y + settings.marginX,
    },
    relationType: link.target.data.relationTypeFromParent ?? 'PREREQ',
  }))

  return {
    nodes,
    links,
    width: maxY + settings.nodeWidth + settings.marginX,
    height: maxX - minX + settings.rowHeight + settings.marginY,
  }
}
