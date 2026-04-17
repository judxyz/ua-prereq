import type { CourseSummary } from '../types/course'
import { fetchJson, getApiBaseUrl } from './client'

export async function fetchCourses(): Promise<CourseSummary[]> {
  const url = new URL('/courses', getApiBaseUrl())
  return fetchJson<CourseSummary[]>(url)
}
