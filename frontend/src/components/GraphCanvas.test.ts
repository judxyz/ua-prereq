import { describe, expect, it } from 'vitest'
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
