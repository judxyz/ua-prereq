import type { GraphResponse } from '../types/graph'

const DEFAULT_API_BASE_URL = 'http://localhost:8000'

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL
}

export interface FetchGraphOptions {
  maxDepth?: number
  includeCoreqs?: boolean
}

export async function fetchCourseGraph(
  code: string,
  options: FetchGraphOptions = {},
): Promise<GraphResponse> {
  const trimmedCode = code.trim()

  if (!trimmedCode) {
    throw new Error('A course code is required to load the graph.')
  }

  const url = new URL(`/graph/${encodeURIComponent(trimmedCode)}`, getApiBaseUrl())

  if (typeof options.maxDepth === 'number') {
    url.searchParams.set('max_depth', String(options.maxDepth))
  }

  if (typeof options.includeCoreqs === 'boolean') {
    url.searchParams.set('include_coreqs', String(options.includeCoreqs))
  }

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`Failed to load graph for ${trimmedCode} (${response.status}).`)
  }

  return (await response.json()) as GraphResponse
}
