import type { CourseSummary, ParseStatus, RootCourse } from './course'

export type NodeType = 'course' | 'group'
export type GroupType = 'ANY_OF' | 'ALL_OF' | 'COREQ' | 'UNKNOWN'
export type RelationType = 'PREREQ' | 'COREQ'
export type VisualStyle = string | null

export interface FetchCourseGraphOptions {
  maxDepth?: number
  includeCoreqs?: boolean
}

export interface GraphMeta {
  maxDepth: number
  includeCoreqs: boolean
}

export interface GraphGroup {
  id: number
  nodeId: string
  courseId: number
  groupType: GroupType
  parentGroupId: number | null
  displayLabel: string | null
  label: string
  visualStyle: VisualStyle
}

export type GraphItemCourse = CourseSummary

export interface GraphItem {
  id: number
  groupId: number
  requiredCourseId: number
  relationType: RelationType
  itemOrder: number | null
  course: GraphItemCourse
}

export interface BaseNode {
  id: string
  type: NodeType
  depth: number
}

export interface CourseNode extends BaseNode {
  type: 'course'
  courseId: number
  code: string
  subject: string
  number: string | number
  title: string
  parseStatus: ParseStatus
}

export interface GroupNode extends BaseNode {
  type: 'group'
  groupId: number
  groupType: GroupType
  label: string
  displayLabel: string | null
  visualStyle: VisualStyle
}

export type GraphNode = CourseNode | GroupNode

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
  meta: GraphMeta
}

export interface LayoutNodeDataMap {
  course: CourseNode
  group: GroupNode
}

interface BaseLayoutHierarchyNode<TType extends NodeType> {
  id: string
  originalNodeId: string
  type: TType
  depth: number
  data: LayoutNodeDataMap[TType]
  relationTypeFromParent?: RelationType
  children: LayoutHierarchyNode[]
  isReference?: boolean
}

export interface LayoutHierarchyCourseNode extends BaseLayoutHierarchyNode<'course'> {
  type: 'course'
}

export interface LayoutHierarchyGroupNode extends BaseLayoutHierarchyNode<'group'> {
  type: 'group'
}

export type LayoutHierarchyNode = LayoutHierarchyCourseNode | LayoutHierarchyGroupNode

export interface LayoutConfig {
  levelGap: number
  siblingGap: number
  marginX: number
  marginY: number
}

interface BasePositionedNode<TType extends NodeType> {
  id: string
  originalNodeId: string
  type: TType
  x: number
  y: number
  depth: number
  data: LayoutNodeDataMap[TType]
  isReference?: boolean
}

export type PositionedNode =
  | BasePositionedNode<'course'>
  | BasePositionedNode<'group'>

export interface PositionedLink {
  id: string
  sourceId: string
  targetId: string
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
  nodes: PositionedNode[]
  links: PositionedLink[]
  width: number
  height: number
}
