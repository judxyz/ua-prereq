import type {
  CourseNode as GraphCourseNode,
  GraphEdge,
  GraphGroup,
  GraphItem,
  GraphNode,
  GroupNode as GraphGroupNode,
} from '../types/graph'

export function isCourseNode(node: GraphNode): node is GraphCourseNode {
  return node.type === 'course'
}

export function isGroupNode(node: GraphNode): node is GraphGroupNode {
  return node.type === 'group'
}

export function createNodeLookup(nodes: GraphNode[]) {
  return new Map(nodes.map((node) => [node.id, node]))
}

export function createGroupLookup(groups: GraphGroup[]) {
  return new Map(groups.map((group) => [group.id, group]))
}

export function createChildGroupLookup(groups: GraphGroup[]) {
  return groups.reduce<Map<number, GraphGroup[]>>((accumulator, group) => {
    if (group.parentGroupId === null) {
      return accumulator
    }

    const existingGroups = accumulator.get(group.parentGroupId) ?? []
    existingGroups.push(group)
    accumulator.set(group.parentGroupId, existingGroups)
    return accumulator
  }, new Map())
}

export function createItemsByGroupLookup(items: GraphItem[]) {
  return items.reduce<Map<number, GraphItem[]>>((accumulator, item) => {
    const existingItems = accumulator.get(item.groupId) ?? []
    existingItems.push(item)
    accumulator.set(item.groupId, existingItems)
    return accumulator
  }, new Map())
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

export function getTopLevelGroupsForCourse(courseId: number, groups: GraphGroup[]) {
  return groups
    .filter((group) => group.courseId === courseId && group.parentGroupId === null)
    .sort((left, right) => left.id - right.id)
}

export function getChildGroupsForGroup(
  groupId: number,
  childGroupLookup: Map<number, GraphGroup[]>,
) {
  return [...(childGroupLookup.get(groupId) ?? [])].sort((left, right) => left.id - right.id)
}

export function getOrderedItemsForGroup(groupId: number, itemsByGroupId: Map<number, GraphItem[]>) {
  return sortItemsByOrder(itemsByGroupId.get(groupId) ?? [])
}
