import type { CourseSummary, RootCourse } from './course'

export type GroupType = 'ANY_OF' | 'ALL_OF' | 'COREQ' | 'UNKNOWN'
export type RelationType = 'PREREQ' | 'COREQ'

export interface GraphGroup {
  id: number
  nodeId: string
  courseId: number
  groupType: GroupType
  parentGroupId: number | null
  displayLabel: string | null
  label: string
  visualStyle: string | null
}

export interface GraphItem {
  id: number
  groupId: number
  requiredCourseId: number
  relationType: RelationType
  itemOrder: number | null
  course: CourseSummary
}

interface BaseGraphNode {
  id: string
  depth: number
}

export interface CourseGraphNode extends BaseGraphNode {
  type: 'course'
  courseId: number
  course: CourseSummary | RootCourse
}

export interface GroupGraphNode extends BaseGraphNode {
  type: 'group'
  groupId: number
  groupType: GroupType
  label: string
  displayLabel: string | null
  visualStyle: string | null
}

export type GraphNode = CourseGraphNode | GroupGraphNode

export interface GraphEdge {
  id: string
  source: string
  target: string
  relationType: RelationType
}

export interface GraphResponse {
  rootCourse: RootCourse
  groups: GraphGroup[]
  items: GraphItem[]
  nodes: GraphNode[]
  edges: GraphEdge[]
  rawPrerequisiteText: string | null
  rawCorequisiteText: string | null
  meta: {
    maxDepth: number
    includeCoreqs: boolean
  }
}

interface BaseHierarchyNode {
  id: string
  depth: number
  label: string
  relationTypeFromParent?: RelationType
  children: HierarchyNode[]
}

export interface HierarchyCourseNode extends BaseHierarchyNode {
  kind: 'course'
  courseId: number
  course: CourseSummary | RootCourse
}

export interface HierarchyGroupNode extends BaseHierarchyNode {
  kind: 'group'
  groupId: number
  groupType: GroupType
  label: string
  displayLabel: string | null
  visualStyle: string | null
}

export type HierarchyNode = HierarchyCourseNode | HierarchyGroupNode

export interface LayoutedNode {
  id: string
  x: number
  y: number
  depth: number
  data: HierarchyNode
}

export interface LayoutedLink {
  id: string
  source: {
    x: number
    y: number
  }
  target: {
    x: number
    y: number
  }
  relationType: RelationType
}

export interface LayoutResult {
  nodes: LayoutedNode[]
  links: LayoutedLink[]
  width: number
  height: number
}
