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
const AND_COLOR = '#8c4575'
const COREQ_COLOR = '#22407a'
const NEUTRAL_GROUP_BACKGROUND = '#f3f1ec'
const NEUTRAL_GROUP_BORDER = '#d7d2c7'
const REQUIREMENT_BACKGROUND = '#f6efe5'
const REQUIREMENT_BORDER = '#d7c5ad'

const graphOptions: Options = {
  autoResize: true,
  layout: {
    hierarchical: {
      enabled: true,
      direction: 'UD',
      sortMethod: 'directed',
      shakeTowards: 'roots',
      levelSeparation: 200,
      nodeSpacing: 150,
      treeSpacing: 360,
      
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

function getGroupStyle(groupType: GroupType) {
  if (groupType === 'ALL_OF') {
    return {
      shape: 'box',
      label: 'AND',
      background: AND_COLOR,
      border: AND_COLOR,
      fontColor: '#ffffff',
      size: undefined,
      widthConstraint: {
        minimum: 96,
        maximum: 96,
      },
      heightConstraint: {
        minimum: 34,
      },
    }
  }

  if (groupType === 'ANY_OF') {
    return {
      shape: 'ellipse',
      label: 'OR',
      background: OR_COLOR,
      border: OR_COLOR,
      fontColor: '#ffffff',
      size: undefined,
      widthConstraint: 84,
      heightConstraint: undefined,
    }
  }

  if (groupType === 'COREQ') {
    return {
      shape: 'box',
      label: 'COREQ',
      background: COREQ_COLOR,
      border: COREQ_COLOR,
      fontColor: '#ffffff',
      size: undefined,
      widthConstraint: {
        minimum: 96,
        maximum: 96,
      },
      heightConstraint: {
        minimum: 34,
      },
    }
  }
  

  return {
    shape: 'box',
    label: groupType,
    background: NEUTRAL_GROUP_BACKGROUND,
    border: NEUTRAL_GROUP_BORDER,
    fontColor: '#6a675d',
    size: undefined,
    widthConstraint: 84,
    heightConstraint: undefined,
  }
}

function getGroupTypeForEdge(
  edge: GraphResponse['edges'][number],
  nodeLookup: Map<string, GraphNode>,
): GroupType | null {
  const sourceNode = nodeLookup.get(edge.source)
  const targetNode = nodeLookup.get(edge.target)

  if (sourceNode?.type === 'group') {
    return sourceNode.groupType
  }

  if (targetNode?.type === 'group') {
    return targetNode.groupType
  }

  return null
}

function getEdgeColor(groupType: GroupType | null, isCoreq: boolean) {
  if (isCoreq || groupType === 'COREQ') {
    return COREQ_COLOR
  }

  if (groupType === 'ANY_OF') {
    return OR_COLOR
  }

  if (groupType === 'ALL_OF') {
    return AND_COLOR
  }

  return '#275d38'
}

function isTopLevelPrereqGroup(node: GraphNode | undefined, graph: GraphResponse) {
  if (!node || node.type !== 'group' || node.groupType === 'COREQ') {
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

    const directGroupEdges = nextEdges.filter(
      (edge) =>
        edge.source === courseNode.id &&
        edge.relationType === 'PREREQ' &&
        isTopLevelPrereqGroup(nodeLookup.get(edge.target), graph),
    )
    const alreadyHasAllOf = directGroupEdges.some((edge) => {
      const targetNode = nodeLookup.get(edge.target)
      return targetNode?.type === 'group' && targetNode.groupType === 'ALL_OF'
    })

    if (alreadyHasAllOf || directGroupEdges.length <= 1) {
      continue
    }

    const implicitNodeId = `${courseNode.id}-implicit-all-of`
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
      visualStyle: 'implicit',
      depth: courseNode.depth + 1,
    })

    nextEdges = [
      ...nextEdges.filter((edge) => !directGroupEdges.some((groupEdge) => groupEdge.id === edge.id)),
      {
        id: `${implicitNodeId}-edge`,
        source: courseNode.id,
        target: implicitNodeId,
        relationType: 'PREREQ',
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

  return {
    ...graph,
    nodes: nextNodes,
    edges: nextEdges,
  }
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

    const groupStyle = getGroupStyle(node.groupType)

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

  return graph.edges.map((edge) => {
    const groupType = getGroupTypeForEdge(edge, nodeLookup)
    const edgeColor = getEdgeColor(groupType, edge.relationType === 'COREQ')

    return {
      id: edge.id,
      from: edge.source,
      to: edge.target,
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
  const networkRef = useRef<Network | null>(null)
  const requestIdRef = useRef(0)
  const panelOpenFrameRef = useRef<number | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourseState | null>(null)
  const [panelPhase, setPanelPhase] = useState<'hidden' | 'open'>('hidden')

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
    if (!graph || !containerRef.current) {
      return
    }

    const renderGraph = addImplicitAllOfNodes(graph)

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
      network.fit({
        animation: {
          duration: 450,
          easingFunction: 'easeInOutQuad',
        },
      })
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
      network.destroy()
      networkRef.current = null
    }
  }, [graph])

  async function openCourseDetails(node: Extract<GraphNode, { type: 'course' }>) {
    if (node.isAvailable === false) {
      showCoursePanel({
        code: node.code,
        title: 'Course unavailable',
        description: `${node.code} is referenced as a prerequisite, but it is not available in the current course catalog.`,
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

  if (!graph) {
    return (
      <section className="graph-card graph-card-empty">
        <div className="graph-empty-state">
        </div>
      </section>
    )
  }

  return (
    <section className="graph-card">
      <div className="graph-surface-shell">
        <div ref={containerRef} className="graph-network" />

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

        {!selectedCourse ? (
          <p className="graph-selection-hint">Select a course to see description</p>
        ) : null}

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
