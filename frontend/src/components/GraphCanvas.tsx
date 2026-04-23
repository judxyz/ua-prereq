import { useEffect, useRef, useState } from 'react'
import { DataSet } from 'vis-data'
import { Network } from 'vis-network'
import type { Edge, Node, Options } from 'vis-network'
import { fetchCourse } from '../api/courses'
import type { GraphNode, GraphResponse, GroupType } from '../types/graph'

interface GraphCanvasProps {
  graph: GraphResponse | null
}

interface SelectedCourseState {
  code: string
  title: string
  description: string
  catalogUrl: string | null
  isLoading: boolean
  error: string | null
}

const OR_COLOR = '#27315d'
const AND_COLOR = '#5d274c'
const COREQ_COLOR = '#275d38'
const NEUTRAL_GROUP_BACKGROUND = '#f3f1ec'
const NEUTRAL_GROUP_BORDER = '#d7d2c7'

const graphOptions: Options = {
  autoResize: true,
  layout: {
    hierarchical: {
      enabled: true,
      direction: 'UD',
      sortMethod: 'directed',
      shakeTowards: 'roots',
      levelSeparation: 132,
      nodeSpacing: 180,
      treeSpacing: 240,
    },
  },
  physics: false,
  interaction: {
    dragNodes: true,
    dragView: true,
    hover: true,
    zoomView: true,
    navigationButtons: false,
  },
  nodes: {
    font: {
      face: 'Inter, ui-sans-serif, system-ui, sans-serif',
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
        scaleFactor: 0.7,
      },
    },
    color: {
      color: '#9ab4a1',
      highlight: '#275d38',
      hover: '#275d38',
    },
    smooth: {
      enabled: true,
      type: 'cubicBezier',
      roundness: 0.38,
    },
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
      shape: 'diamond',
      label: 'AND',
      background: AND_COLOR,
      border: AND_COLOR,
      fontColor: '#ffffff',
    }
  }

  if (groupType === 'ANY_OF') {
    return {
      shape: 'ellipse',
      label: 'OR',
      background: OR_COLOR,
      border: OR_COLOR,
      fontColor: '#ffffff',
    }
  }

  if (groupType === 'COREQ') {
    return {
      shape: 'dot',
      label: 'COREQ',
      background: COREQ_COLOR,
      border: COREQ_COLOR,
      fontColor: '#ffffff',
    }
  }

  return {
    shape: 'box',
    label: 'Rule',
    background: NEUTRAL_GROUP_BACKGROUND,
    border: NEUTRAL_GROUP_BORDER,
    fontColor: '#6a675d',
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

  return '#9ab4a1'
}

function toVisNodes(graph: GraphResponse): Node[] {
  return graph.nodes.map((node) => {
    if (node.type === 'course') {
      const isRoot = node.courseId === graph.rootCourse.id

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
          color: isRoot ? '#ffffff' : '#173122',
          size: isRoot ? 17 : 15,
          face: 'Inter, ui-sans-serif, system-ui, sans-serif',
          bold: isRoot ? '700' : '500',
        },
      }
    } else {
      
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
        face: 'Inter, ui-sans-serif, system-ui, sans-serif',
        bold: node.groupType === 'UNKNOWN' ? '500' : '700',
      },
      size: node.groupType === 'COREQ' ? 12 : undefined,
      widthConstraint: node.groupType === 'COREQ' ? 72 : 84,
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
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourseState | null>(null)

  useEffect(() => {
    setSelectedCourse(null)
  }, [graph])

  useEffect(() => {
    if (!graph || !containerRef.current) {
      return
    }

    const network = new Network(
      containerRef.current,
      {
        nodes: new DataSet(toVisNodes(graph)),
        edges: new DataSet(toVisEdges(graph)),
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

      if (!node || node.type !== 'course') {
        return
      }

      void openCourseDetails(node)
    })

    network.on('deselectNode', () => {
      network.unselectAll()
    })

    return () => {
      network.destroy()
      networkRef.current = null
    }
  }, [graph])

  async function openCourseDetails(node: Extract<GraphNode, { type: 'course' }>) {
    const fallbackDescription =
      node.courseId === graph?.rootCourse.id
        ? graph.rootCourse.description ?? 'No description available for this course.'
        : 'Loading course description...'

    setSelectedCourse({
      code: node.code,
      title: node.title,
      description: fallbackDescription,
      catalogUrl:
        node.courseId === graph?.rootCourse.id
          ? graph.rootCourse.catalogUrl
          : buildFallbackCatalogUrl(node.code),
      isLoading: true,
      error: null,
    })

    const currentRequestId = requestIdRef.current + 1
    requestIdRef.current = currentRequestId

    try {
      const details = await fetchCourse(node.code)

      if (requestIdRef.current !== currentRequestId) {
        return
      }

      setSelectedCourse({
        code: details.code,
        title: details.title,
        description: details.description ?? 'No description available for this course.',
        catalogUrl: details.catalogUrl ?? buildFallbackCatalogUrl(details.code),
        isLoading: false,
        error: null,
      })
    } catch (unknownError) {
      if (requestIdRef.current !== currentRequestId) {
        return
      }

      const message =
        unknownError instanceof Error ? unknownError.message : 'Unable to load course details.'

      setSelectedCourse((current) =>
        current
          ? {
              ...current,
              description:
                node.courseId === graph?.rootCourse.id
                  ? graph.rootCourse.description ?? 'No description available for this course.'
                  : 'Description unavailable for this course.',
              isLoading: false,
              error: message,
            }
          : null,
      )
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
          <h2>Search for a course to begin</h2>
          <p>The prerequisite map will appear here with the selected course at the top and prerequisites beneath it.</p>
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
            -
          </button>
          <button type="button" className="graph-action-button" onClick={zoomIn} aria-label="Zoom in">
            +
          </button>
          <button type="button" className="graph-action-button graph-action-button-reset" onClick={resetView}>
            Reset
          </button>
        </div>

        {selectedCourse ? (
          <aside className="course-panel">
            <div className="course-panel-header">
              <div>
                <h3>{getCoursePanelHeading(selectedCourse.code)}</h3>
              </div>
              <button
                type="button"
                className="course-panel-close"
                onClick={() => setSelectedCourse(null)}
                aria-label="Close course details"
              >
                Close
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
                See in UAlberta Calendar
              </a>
            ) : null}
            <p className="course-panel-section-title">Description</p>
            <p className="course-panel-description">{selectedCourse.description}</p>
            {selectedCourse.isLoading ? <span className="course-panel-pill">Loading details...</span> : null}
            {selectedCourse.error ? <p className="course-panel-error">{selectedCourse.error}</p> : null}
          </aside>
        ) : null}
      </div>
    </section>
  )
}
