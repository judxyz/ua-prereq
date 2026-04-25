import type {
  CourseNode,
  GraphEdge,
  GraphGroup,
  GraphItem,
  GraphNode,
  GraphResponse,
  GroupNode,
  LayoutHierarchyNode,
  RelationType,
} from '../types/graph'
import {
  createGroupLookup,
  createNodeLookup,
  getTopLevelGroupsForCourse,
  getChildGroupsForGroup,
  getOrderedItemsForGroup,
} from './graphUtils'

interface BuildHierarchyContext {
  childGroupsByParentId: Map<number, GraphGroup[]>
  groupLookup: Map<number, GraphGroup>
  itemsByGroupId: Map<number, GraphItem[]>
  nodeLookup: Map<string, GraphNode>
  outgoingEdgeMap: Map<string, GraphEdge[]>
  itemCourseNodeMap: Map<number, CourseNode>
}

function createOutgoingEdgeMap(edges: GraphEdge[]) {
  return edges.reduce<Map<string, GraphEdge[]>>((accumulator, edge) => {
    const existingEdges = accumulator.get(edge.source) ?? []
    existingEdges.push(edge)
    accumulator.set(edge.source, existingEdges)
    return accumulator
  }, new Map())
}

function createBuildContext(graph: GraphResponse): BuildHierarchyContext {
  return {
    childGroupsByParentId: graph.groups.reduce<Map<number, GraphGroup[]>>((accumulator, group) => {
      if (group.parentGroupId === null) {
        return accumulator
      }

      const existingGroups = accumulator.get(group.parentGroupId) ?? []
      existingGroups.push(group)
      accumulator.set(group.parentGroupId, existingGroups)
      return accumulator
    }, new Map()),
    groupLookup: createGroupLookup(graph.groups),
    itemsByGroupId: graph.items.reduce<Map<number, GraphItem[]>>((accumulator, item) => {
      const existingItems = accumulator.get(item.groupId) ?? []
      existingItems.push(item)
      accumulator.set(item.groupId, existingItems)
      return accumulator
    }, new Map()),
    nodeLookup: createNodeLookup(graph.nodes),
    outgoingEdgeMap: createOutgoingEdgeMap(graph.edges),
    itemCourseNodeMap: graph.items.reduce<Map<number, CourseNode>>((accumulator, item) => {
      accumulator.set(item.requiredCourseId, {
        id: `course-${item.requiredCourseId}`,
        type: 'course',
        depth: 0,
        courseId: item.requiredCourseId,
        code: item.course.code,
        subject: item.course.subject ?? '',
        number: item.course.number,
        title: item.course.title,
        parseStatus: item.course.parseStatus,
      })
      return accumulator
    }, new Map()),
  }
}

function createRootCourseNode(graph: GraphResponse): CourseNode {
  return {
    id: `course-${graph.rootCourse.id}`,
    type: 'course',
    depth: 0,
    courseId: graph.rootCourse.id,
    code: graph.rootCourse.code,
    subject: graph.rootCourse.subject,
    number: graph.rootCourse.number,
    title: graph.rootCourse.title,
    parseStatus: graph.rootCourse.parseStatus,
  }
}

function getCourseNodeData(courseNodeId: string, graph: GraphResponse, context: BuildHierarchyContext): CourseNode {
  const existingNode = context.nodeLookup.get(courseNodeId)

  if (existingNode?.type === 'course') {
    const fallbackNode =
      existingNode.courseId === null ? undefined : context.itemCourseNodeMap.get(existingNode.courseId)

    return {
      ...existingNode,
      subject: fallbackNode?.subject ?? graph.rootCourse.subject,
      number: fallbackNode?.number ?? graph.rootCourse.number,
      parseStatus:
        fallbackNode?.parseStatus ??
        (existingNode.courseId === graph.rootCourse.id ? graph.rootCourse.parseStatus : 'unparsed'),
    }
  }

  if (courseNodeId === `course-${graph.rootCourse.id}`) {
    return createRootCourseNode(graph)
  }

  const courseId = Number(courseNodeId.replace('course-', ''))
  const itemNode = context.itemCourseNodeMap.get(courseId)

  if (itemNode) {
    return itemNode
  }

  throw new Error(`Missing course node data for ${courseNodeId}`)
}

function getGroupNodeData(groupNodeId: string, context: BuildHierarchyContext): GroupNode {
  const existingNode = context.nodeLookup.get(groupNodeId)

  if (existingNode?.type === 'group') {
    return existingNode
  }

  const groupId = Number(groupNodeId.replace('group-', ''))
  const group = context.groupLookup.get(groupId)

  if (!group) {
    throw new Error(`Missing group node data for ${groupNodeId}`)
  }

  return {
    id: group.nodeId,
    type: 'group',
    depth: 0,
    groupId: group.id,
    groupType: group.groupType,
    label: group.label,
    displayLabel: group.displayLabel,
    visualStyle: group.visualStyle,
  }
}

function createVisualNodeId(originalNodeId: string, path: string[]) {
  return `${originalNodeId}::${path.join('/')}`
}

function createImplicitAllOfGroupNode(courseNodeId: string, depth: number): GroupNode {
  return {
    id: `${courseNodeId}-implicit-all-of`,
    type: 'group',
    depth,
    groupId: -1,
    groupType: 'ALL_OF',
    label: 'and',
    displayLabel: 'and',
    visualStyle: 'implicit',
  }
}

function getOrderedCourseChildrenForGroup(
  group: GraphGroup,
  context: BuildHierarchyContext,
): Array<{ targetNodeId: string; relationType: RelationType; sortKey: number }> {
  const orderedItems = getOrderedItemsForGroup(group.id, context.itemsByGroupId)
  const outgoingEdges = context.outgoingEdgeMap.get(group.nodeId) ?? []

  return orderedItems.flatMap((item, index) => {
    const matchingEdge = outgoingEdges.find(
      (edge) =>
        edge.target === `course-${item.requiredCourseId}` && edge.relationType === item.relationType,
    )

    if (!matchingEdge) {
      return []
    }

    return [
      {
        targetNodeId: matchingEdge.target,
        relationType: matchingEdge.relationType,
        sortKey: item.itemOrder ?? index,
      },
    ]
  })
}

function shouldCollapseGroupNode(group: GraphGroup, childCount: number) {
  return childCount === 1 && (group.groupType === 'ALL_OF' || group.groupType === 'COREQ')
}

function buildGroupHierarchyBranch(
  groupNodeId: string,
  graph: GraphResponse,
  context: BuildHierarchyContext,
  depth: number,
  path: string[],
  ancestry: Set<string>,
  relationTypeFromParent: RelationType = 'PREREQ',
): LayoutHierarchyNode[] {
  const groupData = getGroupNodeData(groupNodeId, context)
  const group = context.groupLookup.get(groupData.groupId)

  if (!group) {
    throw new Error(`Missing group metadata for ${groupNodeId}`)
  }

  const nestedGroups = getChildGroupsForGroup(group.id, context.childGroupsByParentId)
  const courseChildren = getOrderedCourseChildrenForGroup(group, context)

  const children: LayoutHierarchyNode[] = [
    ...nestedGroups.flatMap((nestedGroup, index) =>
      buildGroupHierarchyBranch(
        nestedGroup.nodeId,
        graph,
        context,
        depth + 1,
        [...path, `nested-group-${nestedGroup.id}-${index}`],
        ancestry,
        nestedGroup.groupType === 'COREQ' ? 'COREQ' : relationTypeFromParent,
      ),
    ),
    ...courseChildren.map((child, index) => {
      const isReference = ancestry.has(child.targetNodeId)

      return buildCourseHierarchyNode(
        child.targetNodeId,
        graph,
        context,
        depth + 1,
        [...path, `course-${child.targetNodeId}-${index}`],
        ancestry,
        child.relationType,
        isReference,
      )
    }),
  ]

  if (shouldCollapseGroupNode(group, children.length)) {
    return children
  }

  return [
    {
      id: createVisualNodeId(groupNodeId, path),
      originalNodeId: groupNodeId,
      type: 'group',
      depth,
      data: {
        ...groupData,
        depth,
      },
      relationTypeFromParent,
      children,
    },
  ]
}

function buildCourseHierarchyNode(
  courseNodeId: string,
  graph: GraphResponse,
  context: BuildHierarchyContext,
  depth: number,
  path: string[],
  ancestry: Set<string>,
  relationTypeFromParent?: RelationType,
  isReference = false,
): LayoutHierarchyNode {
  const courseData = getCourseNodeData(courseNodeId, graph, context)
  const visualId = createVisualNodeId(courseNodeId, path)
  const nextAncestry = new Set(ancestry)
  nextAncestry.add(courseNodeId)

  const topLevelGroups = isReference
    ? []
    : courseData.courseId === null
      ? []
      : getTopLevelGroupsForCourse(courseData.courseId, graph.groups)

  const courseChildren =
    topLevelGroups.length <= 1
      ? topLevelGroups.flatMap((group, index) =>
          buildGroupHierarchyBranch(
            group.nodeId,
            graph,
            context,
            depth + 1,
            [...path, `group-${group.id}-${index}`],
            nextAncestry,
            group.groupType === 'COREQ' ? 'COREQ' : 'PREREQ',
          ),
        )
      : [
          {
            id: createVisualNodeId(`${courseNodeId}-implicit-all-of`, [...path, 'implicit-all-of']),
            originalNodeId: `${courseNodeId}-implicit-all-of`,
            type: 'group' as const,
            depth: depth + 1,
            data: createImplicitAllOfGroupNode(courseNodeId, depth + 1),
            relationTypeFromParent: 'PREREQ' as const,
            children: topLevelGroups.flatMap((group, index) =>
              buildGroupHierarchyBranch(
                group.nodeId,
                graph,
                context,
                depth + 2,
                [...path, 'implicit-all-of', `group-${group.id}-${index}`],
                nextAncestry,
                group.groupType === 'COREQ' ? 'COREQ' : 'PREREQ',
              ),
            ),
          },
        ]

  return {
    id: visualId,
    originalNodeId: courseNodeId,
    type: 'course',
    depth,
    data: {
      ...courseData,
      depth,
    },
    relationTypeFromParent,
    isReference,
    children: courseChildren,
  }
}

export function buildHierarchy(graph: GraphResponse): LayoutHierarchyNode {
  const context = createBuildContext(graph)
  const rootNodeId = `course-${graph.rootCourse.id}`

  return buildCourseHierarchyNode(rootNodeId, graph, context, 0, ['root'], new Set())
}
