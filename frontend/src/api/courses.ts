import type { CourseSummary } from '../types/course'

const DEFAULT_API_BASE_URL = 'http://localhost:8000'

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL
}

export async function fetchCourses(): Promise<CourseSummary[]> {
  const url = new URL('/courses', getApiBaseUrl())
  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`Failed to load courses (${response.status}).`)
  }

  return (await response.json()) as CourseSummary[]
}
