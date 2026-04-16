import type { FetchCourseGraphOptions, GraphResponse } from '../types/graph'
import { normalizeCourseCode } from '../lib/courseCode'
import { fetchJson, getApiBaseUrl } from './client'

function toBackendMaxDepth(courseDepth: number) {
  return Math.max(0, courseDepth * 2)
}

export async function fetchCourseGraph(
  code: string,
  options: FetchCourseGraphOptions = {},
): Promise<GraphResponse> {
  const trimmedCode = normalizeCourseCode(code)

  if (!trimmedCode) {
    throw new Error('A course code is required to load the graph.')
  }

  const url = new URL(`/graph/${encodeURIComponent(trimmedCode)}`, getApiBaseUrl())

  if (typeof options.maxDepth === 'number') {
    url.searchParams.set('max_depth', String(toBackendMaxDepth(options.maxDepth)))
  }

  if (typeof options.includeCoreqs === 'boolean') {
    url.searchParams.set('include_coreqs', String(options.includeCoreqs))
  }

  return fetchJson<GraphResponse>(url)
}
