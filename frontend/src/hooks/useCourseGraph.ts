import { useEffect, useState } from 'react'
import { fetchCourseGraph } from '../api/graph'
import type { GraphResponse } from '../types/graph'

export interface UseCourseGraphState {
  selectedCourseCode: string
  maxDepth: number
  includeCoreqs: boolean
  graph: GraphResponse | null
  isLoading: boolean
  error: string | null
  setSelectedCourseCode: (code: string) => void
  setMaxDepth: (depth: number) => void
  setIncludeCoreqs: (include: boolean) => void
}

export function useCourseGraph(initialCourseCode = '', initialMaxDepth = 4): UseCourseGraphState {
  const [selectedCourseCode, setSelectedCourseCode] = useState(initialCourseCode)
  const [maxDepth, setMaxDepth] = useState(initialMaxDepth)
  const [includeCoreqs, setIncludeCoreqs] = useState(true)
  const [graph, setGraph] = useState<GraphResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const normalizedCode = selectedCourseCode.trim()

    if (!normalizedCode) {
      setGraph(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let isCancelled = false

    async function loadGraph() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchCourseGraph(normalizedCode, {
          maxDepth,
          includeCoreqs,
        })

        if (!isCancelled) {
          setGraph(response)
        }
      } catch (unknownError) {
        if (!isCancelled) {
          const message =
            unknownError instanceof Error ? unknownError.message : 'An unknown error occurred.'
          setError(message)
          setGraph(null)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadGraph()

    return () => {
      isCancelled = true
    }
  }, [selectedCourseCode, maxDepth, includeCoreqs])

  return {
    selectedCourseCode,
    maxDepth,
    includeCoreqs,
    graph,
    isLoading,
    error,
    setSelectedCourseCode,
    setMaxDepth,
    setIncludeCoreqs,
  }
}
