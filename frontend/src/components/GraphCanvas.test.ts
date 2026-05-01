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

  it('keeps styled coreq group nodes but removes plain COREQ label nodes', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'root', type: 'course', depth: 0, courseId: 1, code: 'CMPUT 261', subject: 'CMPUT', number: 261, title: 'Machine Intelligence I', parseStatus: 'parsed' },
        { id: 'coreq-label', type: 'group', depth: 1, groupId: 31, groupType: 'COREQ', label: 'COREQ', displayLabel: 'COREQ', visualStyle: null },
        { id: 'coreq-or', type: 'group', depth: 2, groupId: 32, groupType: 'COREQ', label: 'COREQ', displayLabel: 'COREQ', visualStyle: 'or' },
        { id: 'child', type: 'course', depth: 3, courseId: 2, code: 'CMPUT 204', subject: 'CMPUT', number: 204, title: 'Algorithms I', parseStatus: 'parsed' },
      ],
      edges: [
        { id: 'e1', source: 'root', target: 'coreq-label', relationType: 'COREQ' },
        { id: 'e2', source: 'coreq-label', target: 'coreq-or', relationType: 'COREQ' },
        { id: 'e3', source: 'coreq-or', target: 'child', relationType: 'COREQ' },
      ],
    })

    const simplified = simplifyPrereqRelationNodes(graph)

    expect(simplified.nodes.map((node) => node.id)).toContain('coreq-or')
    expect(simplified.nodes.map((node) => node.id)).not.toContain('coreq-label')
    expect(simplified.edges.some((edge) => edge.source === 'root' && edge.target === 'coreq-or')).toBe(true)
  })

  it('removes redundant top-level AND group and bridges root directly to children', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'root', type: 'course', depth: 0, courseId: 1, code: 'CMPUT 204', subject: 'CMPUT', number: 204, title: 'Algorithms I', parseStatus: 'parsed' },
        { id: 'top-and', type: 'group', depth: 1, groupId: 41, groupType: 'ALL_OF', label: 'AND', displayLabel: 'AND', visualStyle: null },
        { id: 'or-a', type: 'group', depth: 2, groupId: 42, groupType: 'ANY_OF', label: 'OR', displayLabel: 'OR', visualStyle: null },
        { id: 'child', type: 'course', depth: 2, courseId: 2, code: 'CMPUT 272', subject: 'CMPUT', number: 272, title: 'Formal Systems', parseStatus: 'parsed' },
      ],
      edges: [
        { id: 'e1', source: 'root', target: 'top-and', relationType: 'PREREQ' },
        { id: 'e2', source: 'top-and', target: 'or-a', relationType: 'PREREQ' },
        { id: 'e3', source: 'top-and', target: 'child', relationType: 'PREREQ' },
      ],
    })

    const simplified = simplifyPrereqRelationNodes(graph)
    expect(simplified.nodes.map((node) => node.id)).not.toContain('top-and')
    expect(simplified.edges.some((edge) => edge.source === 'root' && edge.target === 'or-a')).toBe(true)
    expect(simplified.edges.some((edge) => edge.source === 'root' && edge.target === 'child')).toBe(true)
  })

  it('keeps nested AND groups that are not direct root wrappers', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'root', type: 'course', depth: 0, courseId: 1, code: 'CMPUT 204', subject: 'CMPUT', number: 204, title: 'Algorithms I', parseStatus: 'parsed' },
        { id: 'or-top', type: 'group', depth: 1, groupId: 51, groupType: 'ANY_OF', label: 'OR', displayLabel: 'OR', visualStyle: null },
        { id: 'and-nested', type: 'group', depth: 2, groupId: 52, groupType: 'ALL_OF', label: 'AND', displayLabel: 'AND', visualStyle: null },
        { id: 'child', type: 'course', depth: 3, courseId: 2, code: 'MATH 144', subject: 'MATH', number: 144, title: 'Calc II', parseStatus: 'parsed' },
      ],
      edges: [
        { id: 'e1', source: 'root', target: 'or-top', relationType: 'PREREQ' },
        { id: 'e2', source: 'or-top', target: 'and-nested', relationType: 'PREREQ' },
        { id: 'e3', source: 'and-nested', target: 'child', relationType: 'PREREQ' },
      ],
    })

    const simplified = simplifyPrereqRelationNodes(graph)
    expect(simplified.nodes.map((node) => node.id)).toContain('and-nested')
  })
})
