import type {
  CourseGraphNode,
  GraphEdge,
  GraphGroup,
  GraphItem,
  GraphNode,
  GroupGraphNode,
} from '../types/graph'

export function isCourseNode(node: GraphNode): node is CourseGraphNode {
  return node.type === 'course'
}

export function isGroupNode(node: GraphNode): node is GroupGraphNode {
  return node.type === 'group'
}

export function createNodeLookup(nodes: GraphNode[]) {
  return new Map(nodes.map((node) => [node.id, node]))
}

export function createGroupLookup(groups: GraphGroup[]) {
  return new Map(groups.map((group) => [group.id, group]))
}

export function getNodeById(nodes: GraphNode[], nodeId: string) {
  return createNodeLookup(nodes).get(nodeId)
}

export function getGroupById(groups: GraphGroup[], groupId: number) {
  return createGroupLookup(groups).get(groupId)
}

export function getChildrenForNode(nodeId: string, edges: GraphEdge[], nodes: GraphNode[]) {
  const nodeLookup = createNodeLookup(nodes)

  return edges
    .filter((edge) => edge.source === nodeId)
    .map((edge) => nodeLookup.get(edge.target))
    .filter((node): node is GraphNode => Boolean(node))
}

export function getOutgoingEdges(nodeId: string, edges: GraphEdge[]) {
  return edges.filter((edge) => edge.source === nodeId)
}

export function sortItemsByOrder(items: GraphItem[]) {
  return [...items].sort((left, right) => {
    const leftOrder = left.itemOrder ?? Number.MAX_SAFE_INTEGER
    const rightOrder = right.itemOrder ?? Number.MAX_SAFE_INTEGER

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    return left.course.code.localeCompare(right.course.code)
  })
}

export function getItemsForGroup(groupId: number, items: GraphItem[]) {
  return sortItemsByOrder(items.filter((item) => item.groupId === groupId))
}

export function getChildrenFromEdges(nodeId: string, edges: GraphEdge[]) {
  return getOutgoingEdges(nodeId, edges).map((edge) => edge.target)
}
