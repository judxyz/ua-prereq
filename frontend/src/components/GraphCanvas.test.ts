import { describe, expect, it } from 'vitest'
import { simplifyPrereqRelationNodes } from './GraphCanvas'
import type { GraphResponse } from '../types/graph'

function makeGraph(overrides: Partial<GraphResponse>): GraphResponse {
  return {
    rootCourse: {
      id: 1,
      code: 'CMPUT 174',
      subject: 'CMPUT',
      number: 174,
      title: 'Intro to Computing',
      parseStatus: 'parsed',
      description: null,
      otherNotes: null,
      catalogUrl: null,
    },
    groups: [],
    items: [],
    nodes: [],
    edges: [],
    rawPrerequisiteText: null,
    rawCorequisiteText: null,
    meta: {
      maxDepth: 1,
      includeCoreqs: true,
      viewMode: 'prereq',
    },
    ...overrides,
  }
}

describe('simplifyPrereqRelationNodes', () => {
  it('removes PREREQ/COREQ label nodes and bridges edges in prereq view', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'course-root', type: 'course', depth: 0, courseId: 1, code: 'CMPUT 174', subject: 'CMPUT', number: 174, title: 'Intro', parseStatus: 'parsed' },
        { id: 'group-prereq', type: 'group', depth: 1, groupId: 11, groupType: 'UNKNOWN', label: 'PREREQ', displayLabel: 'PREREQ', visualStyle: null },
        { id: 'course-child', type: 'course', depth: 2, courseId: 2, code: 'MATH 114', subject: 'MATH', number: 114, title: 'Calc', parseStatus: 'parsed' },
      ],
      edges: [
        { id: 'e1', source: 'course-root', target: 'group-prereq', relationType: 'PREREQ' },
        { id: 'e2', source: 'group-prereq', target: 'course-child', relationType: 'PREREQ' },
      ],
    })

    const simplified = simplifyPrereqRelationNodes(graph)

    expect(simplified.nodes.map((node) => node.id)).toEqual(['course-root', 'course-child'])
    expect(simplified.edges).toHaveLength(1)
    expect(simplified.edges[0]).toMatchObject({
      source: 'course-root',
      target: 'course-child',
      relationType: 'PREREQ',
    })
  })

  it('does not alter dependency view graphs', () => {
    const graph = makeGraph({
      meta: {
        maxDepth: 1,
        includeCoreqs: false,
        viewMode: 'dependency',
      },
      nodes: [
        { id: 'a', type: 'course', depth: 0, courseId: 1, code: 'CMPUT 174', subject: 'CMPUT', number: 174, title: 'Intro', parseStatus: 'parsed' },
      ],
      edges: [],
    })

    const simplified = simplifyPrereqRelationNodes(graph)
    expect(simplified).toBe(graph)
  })

  it('drops self-loop edges produced during bridging', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'course-root', type: 'course', depth: 0, courseId: 1, code: 'CMPUT 174', subject: 'CMPUT', number: 174, title: 'Intro', parseStatus: 'parsed' },
        { id: 'group-coreq', type: 'group', depth: 1, groupId: 12, groupType: 'UNKNOWN', label: 'COREQ', displayLabel: 'COREQ', visualStyle: null },
      ],
      edges: [
        { id: 'e1', source: 'course-root', target: 'group-coreq', relationType: 'COREQ' },
        { id: 'e2', source: 'group-coreq', target: 'course-root', relationType: 'COREQ' },
      ],
    })

    const simplified = simplifyPrereqRelationNodes(graph)
    expect(simplified.edges).toHaveLength(0)
  })

  it('deduplicates identical bridged edges', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'root', type: 'course', depth: 0, courseId: 1, code: 'CMPUT 174', subject: 'CMPUT', number: 174, title: 'Intro', parseStatus: 'parsed' },
        { id: 'g1', type: 'group', depth: 1, groupId: 21, groupType: 'UNKNOWN', label: 'PREREQ', displayLabel: 'PREREQ', visualStyle: null },
        { id: 'g2', type: 'group', depth: 1, groupId: 22, groupType: 'UNKNOWN', label: 'PREREQ', displayLabel: 'PREREQ', visualStyle: null },
        { id: 'child', type: 'course', depth: 2, courseId: 2, code: 'MATH 114', subject: 'MATH', number: 114, title: 'Calc', parseStatus: 'parsed' },
      ],
      edges: [
        { id: 'e1', source: 'root', target: 'g1', relationType: 'PREREQ' },
        { id: 'e2', source: 'g1', target: 'child', relationType: 'PREREQ' },
        { id: 'e3', source: 'root', target: 'g2', relationType: 'PREREQ' },
        { id: 'e4', source: 'g2', target: 'child', relationType: 'PREREQ' },
      ],
    })

    const simplified = simplifyPrereqRelationNodes(graph)
    expect(simplified.edges).toHaveLength(1)
    expect(simplified.edges[0]).toMatchObject({
      source: 'root',
      target: 'child',
      relationType: 'PREREQ',
    })
  })
})
