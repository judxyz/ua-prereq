import type { CourseSummary, RootCourse } from '../types/course'
import type {
  GraphGroup,
  GraphItem,
  GraphResponse,
  HierarchyCourseNode,
  HierarchyGroupNode,
  HierarchyNode,
  RelationType,
} from '../types/graph'
import { sortItemsByOrder } from './graphUtils'

interface IndexedGraph {
  childGroupsByParentId: Map<number, GraphGroup[]>
  itemsByGroupId: Map<number, GraphItem[]>
  topLevelGroupsByCourseId: Map<number, GraphGroup[]>
}

function createIndexes(graph: GraphResponse): IndexedGraph {
  const topLevelGroupsByCourseId = new Map<number, GraphGroup[]>()
  const childGroupsByParentId = new Map<number, GraphGroup[]>()
  const itemsByGroupId = new Map<number, GraphItem[]>()

  graph.groups.forEach((group) => {
    if (group.parentGroupId === null) {
      const existingGroups = topLevelGroupsByCourseId.get(group.courseId) ?? []
      existingGroups.push(group)
      topLevelGroupsByCourseId.set(group.courseId, existingGroups)
      return
    }

    const existingGroups = childGroupsByParentId.get(group.parentGroupId) ?? []
    existingGroups.push(group)
    childGroupsByParentId.set(group.parentGroupId, existingGroups)
  })

  graph.items.forEach((item) => {
    const existingItems = itemsByGroupId.get(item.groupId) ?? []
    existingItems.push(item)
    itemsByGroupId.set(item.groupId, existingItems)
  })

  itemsByGroupId.forEach((items, groupId) => {
    itemsByGroupId.set(groupId, sortItemsByOrder(items))
  })

  return {
    childGroupsByParentId,
    itemsByGroupId,
    topLevelGroupsByCourseId,
  }
}

function getCourseLabel(course: RootCourse | CourseSummary) {
  return course.code
}

function getGroupLabel(group: GraphGroup) {
  return group.displayLabel ?? group.label
}

function buildCourseSubtree(
  course: RootCourse | CourseSummary,
  indexes: IndexedGraph,
  activeCourseIds: Set<number>,
  depth: number,
  pathKey: string,
  relationTypeFromParent?: RelationType,
): HierarchyCourseNode {
  const isRepeatedCourse = activeCourseIds.has(course.id)
  const nextCourseIds = new Set(activeCourseIds)
  nextCourseIds.add(course.id)

  const topLevelGroups = isRepeatedCourse
    ? []
    : indexes.topLevelGroupsByCourseId.get(course.id) ?? []

  const children = topLevelGroups.map((group, index) =>
    buildGroupSubtree(
      group,
      indexes,
      nextCourseIds,
      depth + 1,
      `${pathKey}-group-${group.id}-${index}`,
    ),
  )

  return {
    kind: 'course',
    id: `${pathKey}-course-${course.id}`,
    depth,
    label: getCourseLabel(course),
    relationTypeFromParent,
    courseId: course.id,
    course,
    children,
  }
}

function buildGroupSubtree(
  group: GraphGroup,
  indexes: IndexedGraph,
  activeCourseIds: Set<number>,
  depth: number,
  pathKey: string,
): HierarchyGroupNode {
  const nestedGroups = indexes.childGroupsByParentId.get(group.id) ?? []
  const items = indexes.itemsByGroupId.get(group.id) ?? []

  const children: HierarchyNode[] = [
    ...nestedGroups.map((childGroup, index) =>
      buildGroupSubtree(
        childGroup,
        indexes,
        activeCourseIds,
        depth + 1,
        `${pathKey}-nested-${childGroup.id}-${index}`,
      ),
    ),
    ...items.map((item, index) =>
      buildCourseSubtree(
        item.course,
        indexes,
        activeCourseIds,
        depth + 1,
        `${pathKey}-item-${item.id}-${index}`,
        item.relationType,
      ),
    ),
  ]

  return {
    kind: 'group',
    id: `${pathKey}-group-node-${group.id}`,
    depth,
    label: getGroupLabel(group),
    groupId: group.id,
    groupType: group.groupType,
    displayLabel: group.displayLabel,
    visualStyle: group.visualStyle,
    children,
  }
}

export function buildHierarchy(graph: GraphResponse): HierarchyNode {
  const indexes = createIndexes(graph)

  return buildCourseSubtree(
    graph.rootCourse,
    indexes,
    new Set<number>(),
    0,
    'root',
  )
}
