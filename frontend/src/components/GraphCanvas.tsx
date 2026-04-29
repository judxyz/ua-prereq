import { useEffect, useRef, useState } from 'react'
import { DataSet } from 'vis-data'
import { Network } from 'vis-network'
import type { Edge, Node, Options } from 'vis-network'
import { fetchCourse } from '../api/courses'
import type { GraphEdge, GraphNode, GraphResponse, GroupType } from '../types/graph'

interface GraphCanvasProps {
  graph: GraphResponse | null
}

interface SelectedCourseState {
  code: string
  title: string
  description: string
  catalogUrl: string | null
  error: string | null
}

const OR_COLOR = '#414a7a'
const OR_COLOR_BG = '#e6e8f2'
const AND_COLOR = '#8c4575'
const AND_COLOR_BG = '#f2e6f0'
const COREQ_COLOR = '#00757d'
const COREQ_COLOR_BG = '#00757d'

const PREREQ_COLOR = '#752020'
const PREREQ_COLOR_BG = '#752020'

const REQUIREMENT_BACKGROUND = '#45007d'
const REQUIREMENT_BORDER = '#45007d'

const graphOptions: Options = {
  autoResize: true,
  layout: {
    hierarchical: {
      enabled: true,
      direction: 'UD',
      sortMethod: 'directed',
      shakeTowards: 'roots',
      levelSeparation: 100,
      nodeSpacing: 150,
      treeSpacing: 500,
      
    },
  },
  physics: false,
  interaction: {
    dragNodes: false,
    dragView: true,
    hover: true,
    zoomView: true,
    navigationButtons: false,
  },
  nodes: {
    font: {
      face: 'Proxima Nova, Inter',
      color: '#173122',
      size: 15,
    },
    borderWidth: 1.25,
    shadow: {
      enabled: false,
    },
    scaling: {
      label: {
        drawThreshold: 1,
      },
    },
  },
  edges: {
    arrows: {
      to: {
        enabled: true,
        scaleFactor: 0.95,
      },
    },
    color: {
      color: '#275d38',
      highlight: '#275d38',
      hover: '#275d38',
    },
    smooth: false,
    width: 1.35,
  },
}

function buildFallbackCatalogUrl(code: string) {
  const [subject = '', number = ''] = code.split(/\s+/)

  if (!subject || !number) {
    return null
  }

  return `https://apps.ualberta.ca/catalogue/course/${subject.toLowerCase()}/${number.toLowerCase()}`
}

function getCoursePanelHeading(code: string) {
  const compact = code.replace(/\s+/g, '')
  return compact.length <= 8 ? compact : code
}

function getGroupStyle(groupType: GroupType, visualStyle: string | null) {
  if (groupType === 'ALL_OF') {
    return {
      shape: 'box',
      label: 'AND',
      background: AND_COLOR,
      border: AND_COLOR_BG,
      fontColor: '#ffffff',
      size: undefined,
      widthConstraint: {
        minimum: 96,
        maximum: 96,
      },
      heightConstraint: undefined,

    }
  }

  if (groupType === 'ANY_OF') {
    return {
      shape: 'ellipse',
      label: 'OR',
      background: OR_COLOR,
      border: OR_COLOR_BG,
      fontColor: '#ffffff',
      size: undefined,
      widthConstraint: 84,
      heightConstraint: undefined,
    }
  }

  if (groupType === 'COREQ') {
    if (visualStyle === 'or') {
      return {
        shape: 'ellipse',
        label: 'OR',
        background: OR_COLOR,
        border: OR_COLOR_BG,
        fontColor: '#ffffff',
        size: undefined,
        widthConstraint: 84,
        heightConstraint: undefined,
      }
    }

    if (visualStyle === 'and') {
      return {
        shape: 'box',
        label: 'AND',
        background: AND_COLOR_BG,
        border: AND_COLOR,
        fontColor: AND_COLOR,
        size: undefined,
        widthConstraint: {
          minimum: 96,
          maximum: 96,
        },
        heightConstraint: undefined,
      }
    }

    return {
      shape: 'box',
      label: 'COREQ',
      background: COREQ_COLOR,
      border: COREQ_COLOR_BG,
      fontColor: '#ffffff',
      size: undefined,
      widthConstraint: {
        minimum: 96,
        maximum: 96,
      },
      heightConstraint: undefined,

    }
  }
  

  return {
    shape: 'box',
    label: groupType,
    background: PREREQ_COLOR_BG,
    border: PREREQ_COLOR,
    fontColor: '#ffffff',
    size: undefined,
    widthConstraint: 84,
    heightConstraint: undefined,
  }
}

function getGroupContextForEdge(
  edge: GraphResponse['edges'][number],
  nodeLookup: Map<string, GraphNode>,
): { groupType: GroupType | null; visualStyle: string | null } {
  const sourceNode = nodeLookup.get(edge.source)
  const targetNode = nodeLookup.get(edge.target)

  if (sourceNode?.type === 'group') {
    return {
      groupType: sourceNode.groupType,
      visualStyle: sourceNode.visualStyle,
    }
  }

  if (targetNode?.type === 'group') {
    return {
      groupType: targetNode.groupType,
      visualStyle: targetNode.visualStyle,
    }
  }

  return {
    groupType: null,
    visualStyle: null,
  }
}

function getEdgeColor(
  groupContext: { groupType: GroupType | null; visualStyle: string | null },
  isCoreq: boolean,
) {
  const normalizedVisualStyle = (groupContext.visualStyle ?? '').trim().toLowerCase()
  if (normalizedVisualStyle === 'or') {
    return OR_COLOR
  }

  if (normalizedVisualStyle === 'and') {
    return AND_COLOR
  }

  const { groupType } = groupContext
  if (groupType === 'ANY_OF') {
    return OR_COLOR
  }

  if (groupType === 'ALL_OF') {
    return AND_COLOR
  }

  if (isCoreq || groupType === 'COREQ') {
    return COREQ_COLOR
  }

  return PREREQ_COLOR
}

function isTopLevelGroup(
  node: GraphNode | undefined,
  graph: GraphResponse,
  _relationType: GraphEdge['relationType'],
) {
  if (!node || node.type !== 'group') {
    return false
  }

  const group = graph.groups.find((entry) => entry.id === node.groupId)
  return group?.parentGroupId === null
}

function getDescendantNodeIds(rootNodeIds: string[], edges: GraphEdge[]) {
  const descendants = new Set<string>()
  const outgoingEdges = edges.reduce<Map<string, GraphEdge[]>>((accumulator, edge) => {
    const existingEdges = accumulator.get(edge.source) ?? []
    existingEdges.push(edge)
    accumulator.set(edge.source, existingEdges)
    return accumulator
  }, new Map())
  const stack = [...rootNodeIds]

  while (stack.length > 0) {
    const nodeId = stack.pop()

    if (!nodeId || descendants.has(nodeId)) {
      continue
    }

    descendants.add(nodeId)
    for (const edge of outgoingEdges.get(nodeId) ?? []) {
      stack.push(edge.target)
    }
  }

  return descendants
}

function addImplicitAllOfNodes(graph: GraphResponse): GraphResponse {
  const nodeLookup = new Map(graph.nodes.map((node) => [node.id, node]))
  const nextNodes = graph.nodes.map((node) => ({ ...node }))
  let nextEdges = [...graph.edges]

  for (const courseNode of graph.nodes) {
    if (courseNode.type !== 'course' || courseNode.courseId === null) {
      continue
    }

    for (const relationType of ['PREREQ', 'COREQ'] as const) {
      const directGroupEdges = nextEdges.filter(
        (edge) =>
          edge.source === courseNode.id &&
          edge.relationType === relationType &&
          isTopLevelGroup(nodeLookup.get(edge.target), graph, relationType),
      )
      const alreadyHasAllOf = directGroupEdges.some((edge) => {
        const targetNode = nodeLookup.get(edge.target)
        return targetNode?.type === 'group' && targetNode.groupType === 'ALL_OF'
      })

      if (alreadyHasAllOf || directGroupEdges.length <= 1) {
        continue
      }

      const implicitNodeId = `${courseNode.id}-implicit-${relationType.toLowerCase()}-all-of`
      const descendantIds = getDescendantNodeIds(
        directGroupEdges.map((edge) => edge.target),
        nextEdges,
      )

      nextNodes.push({
        id: implicitNodeId,
        type: 'group',
        groupId: -courseNode.courseId,
        groupType: 'ALL_OF',
        label: 'ALL_OF',
        displayLabel: 'ALL_OF',
        visualStyle: relationType === 'COREQ' ? 'implicit-coreq' : 'implicit',
        depth: courseNode.depth + 1,
      })

      nextEdges = [
        ...nextEdges.filter((edge) => !directGroupEdges.some((groupEdge) => groupEdge.id === edge.id)),
        {
          id: `${implicitNodeId}-edge`,
          source: courseNode.id,
          target: implicitNodeId,
          relationType,
        },
        ...directGroupEdges.map((edge, index) => ({
          ...edge,
          id: `${implicitNodeId}-child-${index}`,
          source: implicitNodeId,
        })),
      ]

      for (const node of nextNodes) {
        if (descendantIds.has(node.id)) {
          node.depth += 1
        }
      }
    }
  }

  return {
    ...graph,
    nodes: nextNodes,
    edges: nextEdges,
  }
}

export function simplifyPrereqRelationNodes(graph: GraphResponse): GraphResponse {
  if (isDependencyView(graph)) {
    return graph
  }

  const removableGroupIds = new Set(
    graph.nodes
      .filter((node) => {
        if (node.type !== 'group') {
          return false
        }

        const normalizedLabel = (node.displayLabel ?? node.label).trim().toUpperCase()
        const normalizedVisualStyle = (node.visualStyle ?? '').trim().toLowerCase()
        const isStyledCoreqNode = normalizedVisualStyle === 'and' || normalizedVisualStyle === 'or'
        const isPrereqLabelNode = normalizedLabel === 'PREREQ'
        const isCoreqLabelNode =
          normalizedLabel === 'COREQ' &&
          (node.groupType === 'UNKNOWN' || (node.groupType === 'COREQ' && !isStyledCoreqNode))

        return isPrereqLabelNode || isCoreqLabelNode
      })
      .map((node) => node.id),
  )

  if (removableGroupIds.size === 0) {
    return graph
  }

  let nextEdges = [...graph.edges]

  for (const nodeId of removableGroupIds) {
    const incomingEdges = nextEdges.filter((edge) => edge.target === nodeId)
    const outgoingEdges = nextEdges.filter((edge) => edge.source === nodeId)

    nextEdges = nextEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)

    // Bridge the removed relation-label node so semantic graph direction remains unchanged.
    const bridgedEdges = incomingEdges.flatMap((incomingEdge, incomingIndex) =>
      outgoingEdges.map((outgoingEdge, outgoingIndex) => ({
        id: `${incomingEdge.id}-skip-${nodeId}-${incomingIndex}-${outgoingIndex}`,
        source: incomingEdge.source,
        target: outgoingEdge.target,
        relationType: outgoingEdge.relationType,
      })),
    )

    nextEdges.push(...bridgedEdges)
  }

  const dedupedEdges = new Map<string, GraphEdge>()

  for (const edge of nextEdges) {
    if (edge.source === edge.target) {
      continue
    }

    const key = `${edge.source}|${edge.target}|${edge.relationType}`

    if (!dedupedEdges.has(key)) {
      dedupedEdges.set(key, edge)
    }
  }

  return {
    ...graph,
    nodes: graph.nodes.filter((node) => !removableGroupIds.has(node.id)),
    edges: Array.from(dedupedEdges.values()),
  }
}

function isDependencyView(graph: GraphResponse) {
  return graph.meta.viewMode === 'dependency'
}

function toVisNodes(graph: GraphResponse): Node[] {
  return graph.nodes.map((node) => {
    if (node.type === 'course') {
      const isRoot = node.courseId === graph.rootCourse.id
      const isUnavailable = node.isAvailable === false

      return {
        id: node.id,
        label: node.code,
        level: node.depth,
        shape: 'box',
        margin: {
          top: 12,
          right: 18,
          bottom: 12,
          left: 18,
        },
        color: isRoot
          ? {
              background: '#275D38',
              border: '#275D38',
              highlight: {
                background: '#275D38',
                border: '#173122',
              },
              hover: {
                background: '#2e6c42',
                border: '#173122',
              },
            }
          : isUnavailable
            ? {
                background: '#f4f1ec',
                border: '#c8bfb2',
                highlight: {
                  background: '#f0ebe3',
                  border: '#8f7e6b',
                },
                hover: {
                  background: '#f0ebe3',
                  border: '#8f7e6b',
                },
              }
            : {
                background: '#ffffff',
                border: '#c8d6cc',
                highlight: {
                  background: '#f5f8f5',
                  border: '#275D38',
                },
                hover: {
                  background: '#f5f8f5',
                  border: '#275D38',
                },
              },
        font: {
          color: isRoot ? '#ffffff' : isUnavailable ? '#6a6258' : '#173122',
          size: isRoot ? 17 : 15,
          face: 'Proxima Nova, Inter',
          bold: isRoot ? '700' : isUnavailable ? '400' : '500',
        },
      }
    }

    if (node.type === 'requirement') {
      return {
        id: node.id,
        label: node.label,
        level: node.depth,
        shape: 'box',
        margin: {
          top: 10,
          right: 16,
          bottom: 10,
          left: 16,
        },
        color: {
          background: REQUIREMENT_BACKGROUND,
          border: REQUIREMENT_BORDER,
          highlight: {
            background: '#f1e6d8',
            border: '#b89670',
          },
          hover: {
            background: '#f1e6d8',
            border: '#b89670',
          },
        },
        font: {
          color: '#5f4d38',
          size: 14,
          face: 'Proxima Nova, Inter',
          bold: '500',
        },
        widthConstraint: {
          minimum: 150,
          maximum: 210,
        },
      }
    }

    const groupStyle = getGroupStyle(node.groupType, node.visualStyle)

    return {
      id: node.id,
      label: groupStyle.label,
      level: node.depth,
      shape: groupStyle.shape,
      color: {
        background: groupStyle.background,
        border: groupStyle.border,
        highlight: {
          background: groupStyle.background,
          border: groupStyle.border,
        },
        hover: {
          background: groupStyle.background,
          border: groupStyle.border,
        },
      },
      font: {
        color: groupStyle.fontColor,
        size: 12,
        face: 'Proxima Nova, Inter',
        bold: node.groupType === 'UNKNOWN' ? '500' : '700',
      },
      size: groupStyle.size,
      widthConstraint: groupStyle.widthConstraint,
      heightConstraint: groupStyle.heightConstraint,
    }
  })
}

function toVisEdges(graph: GraphResponse): Edge[] {
  const nodeLookup = new Map(graph.nodes.map((node) => [node.id, node]))
  const reverseDirection = isDependencyView(graph)

  return graph.edges.map((edge) => {
    const groupContext = getGroupContextForEdge(edge, nodeLookup)
    const edgeColor = getEdgeColor(groupContext, edge.relationType === 'COREQ')
    const from = reverseDirection ? edge.target : edge.source
    const to = reverseDirection ? edge.source : edge.target

    return {
      id: edge.id,
      from,
      to,
      dashes: edge.relationType === 'COREQ',
      color: {
        color: edgeColor,
        highlight: edgeColor,
        hover: edgeColor,
      },
    }
  })
}

export function GraphCanvas({ graph }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const helpRef = useRef<HTMLDivElement | null>(null)
  const networkRef = useRef<Network | null>(null)
  const requestIdRef = useRef(0)
  const panelOpenFrameRef = useRef<number | null>(null)
  const savedViewportRef = useRef<{ position: { x: number; y: number }; scale: number } | null>(null)
  const prevRootCourseIdRef = useRef<number | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourseState | null>(null)
  const [panelPhase, setPanelPhase] = useState<'hidden' | 'open'>('hidden')
  const [showHelp, setShowHelp] = useState(false)

  function clearPanelTimers() {
    if (panelOpenFrameRef.current !== null) {
      window.cancelAnimationFrame(panelOpenFrameRef.current)
      panelOpenFrameRef.current = null
    }
  }

  function hideCoursePanelImmediately() {
    clearPanelTimers()
    setPanelPhase('hidden')
    setSelectedCourse(null)
  }

  function showCoursePanel(course: SelectedCourseState) {
    clearPanelTimers()
    setSelectedCourse(course)
    setPanelPhase('hidden')
    panelOpenFrameRef.current = window.requestAnimationFrame(() => {
      panelOpenFrameRef.current = window.requestAnimationFrame(() => {
        setPanelPhase('open')
        panelOpenFrameRef.current = null
      })
    })
  }

  function closeCoursePanel() {
    clearPanelTimers()
    setSelectedCourse(null)
    setPanelPhase('hidden')
  }

  useEffect(() => {
    hideCoursePanelImmediately()
  }, [graph])

  useEffect(() => {
    return () => {
      clearPanelTimers()
    }
  }, [])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (event.target instanceof globalThis.Node && !helpRef.current?.contains(event.target)) {
        setShowHelp(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    if (!graph || !containerRef.current) {
      return
    }

    // Keep render preprocessing deterministic: remove label-only relation nodes first,
    // then add implicit ALL_OF wrappers only when prerequisite mode still needs them.
    const simplifiedGraph = simplifyPrereqRelationNodes(graph)
    const renderGraph = isDependencyView(simplifiedGraph)
      ? simplifiedGraph
      : addImplicitAllOfNodes(simplifiedGraph)

    const network = new Network(
      containerRef.current,
      {
        nodes: new DataSet(toVisNodes(renderGraph)),
        edges: new DataSet(toVisEdges(renderGraph)),
      },
      graphOptions,
    )

    networkRef.current = network

    network.once('afterDrawing', () => {
      const isSameCourse = prevRootCourseIdRef.current === graph.rootCourse.id
      prevRootCourseIdRef.current = graph.rootCourse.id

      if (isSameCourse && savedViewportRef.current) {
        network.moveTo({
          position: savedViewportRef.current.position,
          scale: savedViewportRef.current.scale,
          animation: false,
        })
      } else {
        network.fit({
          animation: {
            duration: 450,
            easingFunction: 'easeInOutQuad',
          },
        })
      }
    })

    network.on('click', (event) => {
      const selectedNodeId = event.nodes[0]

      if (!selectedNodeId) {
        return
      }

      const node = graph.nodes.find((entry) => entry.id === selectedNodeId)

      if (!node || (node.type !== 'course' && node.type !== 'requirement')) {
        return
      }

      if (node.type === 'requirement') {
        showCoursePanel({
          code: 'Requirement',
          title: node.label,
          description: 'This prerequisite is a general requirement rather than a specific course in the catalog.',
          catalogUrl: null,
          error: null,
        })
        return
      }

      void openCourseDetails(node)
    })

    return () => {
      if (networkRef.current) {
        savedViewportRef.current = {
          position: networkRef.current.getViewPosition(),
          scale: networkRef.current.getScale(),
        }
      }
      network.destroy()
      networkRef.current = null
    }
  }, [graph])

  async function openCourseDetails(node: Extract<GraphNode, { type: 'course' }>) {
    if (node.isAvailable === false) {
      showCoursePanel({
        code: node.code,
        title: 'Course unavailable',
        description: `${node.code} is a prerequisite for this course, but is not available in the current course catalog as of 2026-04-27.`,
        catalogUrl: null,
        error: null,
      })
      return
    }

    if (node.courseId === graph?.rootCourse.id) {
      showCoursePanel({
        code: graph.rootCourse.code,
        title: graph.rootCourse.title,
        description: graph.rootCourse.description ?? 'No description available for this course.',
        catalogUrl: graph.rootCourse.catalogUrl ?? buildFallbackCatalogUrl(graph.rootCourse.code),
        error: null,
      })
      return
    }

    const fallbackCatalogUrl =
      node.courseId === graph?.rootCourse.id
        ? graph.rootCourse.catalogUrl
        : buildFallbackCatalogUrl(node.code)

    const currentRequestId = requestIdRef.current + 1
    requestIdRef.current = currentRequestId
    hideCoursePanelImmediately()

    try {
      const details = await fetchCourse(node.code)

      if (requestIdRef.current !== currentRequestId) {
        return
      }

      showCoursePanel({
        code: details.code,
        title: details.title,
        description: details.description ?? 'No description available for this course.',
        catalogUrl: details.catalogUrl ?? buildFallbackCatalogUrl(details.code),
        error: null,
      })
    } catch (unknownError) {
      if (requestIdRef.current !== currentRequestId) {
        return
      }

      const message =
        unknownError instanceof Error ? unknownError.message : 'Unable to load course details.'

      showCoursePanel({
        code: node.code,
        title: node.title,
        description:
          node.courseId === graph?.rootCourse.id
            ? graph.rootCourse.description ?? 'No description available for this course.'
            : 'Description unavailable for this course.',
        catalogUrl: fallbackCatalogUrl,
        error: message,
      })
    }
  }

  function zoomIn() {
    const network = networkRef.current

    if (!network) {
      return
    }

    network.moveTo({
      scale: network.getScale() * 1.15,
      animation: true,
    })
  }

  function zoomOut() {
    const network = networkRef.current

    if (!network) {
      return
    }

    network.moveTo({
      scale: network.getScale() / 1.15,
      animation: true,
    })
  }

  function resetView() {
    networkRef.current?.fit({
      animation: {
        duration: 350,
        easingFunction: 'easeInOutQuad',
      },
    })
  }

  return (
    <section className="graph-card">
      <div className="graph-surface-shell">
        {graph ? <div ref={containerRef} className="graph-network" /> : <div className="graph-empty-state" />}

        <div className="graph-actions">
          <button type="button" className="graph-action-button" onClick={zoomOut} aria-label="Zoom out">
            <span className="graph-action-icon graph-action-icon-minus" aria-hidden="true" />
          </button>
          <button type="button" className="graph-action-button" onClick={zoomIn} aria-label="Zoom in">
            <span className="graph-action-icon graph-action-icon-plus" aria-hidden="true" />
          </button>
          <button type="button" className="graph-action-button graph-action-button-reset" onClick={resetView}>
            Reset
          </button>
        </div>

        {!selectedCourse ? <p className="graph-selection-hint">Select a course to see description</p> : null}

        <div ref={helpRef} className="graph-help-control">
          <button
            type="button"
            className="graph-help-button"
            aria-expanded={showHelp}
            aria-controls="graph-help-popover"
            onClick={() => setShowHelp((open) => !open)}
          >
            How to use
          </button>
          {showHelp ? (
            <section id="graph-help-popover" className="graph-help-popover">
              <p
              >
              Hello! This web app is a tool to visualize the prerequisites & dependencies of courses at the University of Alberta.
              <br />
              <br />
              The graph can be viewed two ways: Prerequisite View and Dependency View.
              <br />
              <br />
              Prerequisite View: 
              <br />
              Search any course to view its prerequisites as a tree with multiple levels, '1 level' means only the immediate prerequisites are displayed. Courses are displayed with group nodes that depict 'and' and 'or' relationships between courses. Click on any course to view its details and navigate directly to the course catalogue page.
              <br />
              <br />
              Dependency View:
              <br />
              Search any course to view all courses that depend on it as a prerequisite. This is particularly helpful in determining the impact of dropping a course.
              <br />
              <br />
              Note: This is a personal project and is not affiliated with the University of Alberta.
              Data is sourced from the University of Alberta's course catalogue.
              <br />
              Data last updated: 2026-04-27

              </p>
            </section>
          ) : null}
        </div>

        {selectedCourse ? (
          <aside className={`course-panel course-panel--${panelPhase}`}>
            <div className="course-panel-header">
              <div>
                <h3>{getCoursePanelHeading(selectedCourse.code)}</h3>
              </div>
              <button
                type="button"
                className="course-panel-close"
                onClick={closeCoursePanel}
                aria-label="Close course details"
                title="Close"
              >
                ×
              </button>
            </div>
            <p className="course-panel-title">{selectedCourse.title}</p>
            {selectedCourse.catalogUrl ? (
              <a
                href={selectedCourse.catalogUrl}
                target="_blank"
                rel="noreferrer"
                className="course-panel-link"
              >
                Open in course catalogue
              </a>
            ) : null}
            <p className="course-panel-section-title">Description</p>
            <p className="course-panel-description">{selectedCourse.description}</p>
            {selectedCourse.error ? <p className="course-panel-error">{selectedCourse.error}</p> : null}
          </aside>
        ) : null}
      </div>
    </section>
  )
}
