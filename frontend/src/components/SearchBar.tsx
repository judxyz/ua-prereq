import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { fetchCourses } from '../api/courses'
import type { CourseSummary } from '../types/course'

interface SearchBarProps {
  onSelectCourse: (courseCode: string) => void
  initialValue?: string
}

export function SearchBar({ onSelectCourse, initialValue = '' }: SearchBarProps) {
  const [query, setQuery] = useState(initialValue)
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadCourses() {
      try {
        const result = await fetchCourses()
        if (!isCancelled) {
          setCourses(result)
        }
      } catch (unknownError) {
        if (!isCancelled) {
          const message =
            unknownError instanceof Error ? unknownError.message : 'Unable to load courses.'
          setError(message)
        }
      }
    }

    void loadCourses()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    setQuery(initialValue)
  }, [initialValue])

  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    if (!normalized) {
      return courses.slice(0, 8)
    }

    return courses
      .filter((course) =>
        `${course.code} ${course.title}`.toLowerCase().includes(normalized),
      )
      .slice(0, 8)
  }, [courses, query])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!query.trim()) {
      return
    }

    onSelectCourse(query.trim().toUpperCase())
  }

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search CMPUT course code or title"
          aria-label="Search CMPUT course"
        />
        <button type="submit">Open graph</button>
      </form>
      {error ? <p className="search-error">{error}</p> : null}
      <div className="search-results">
        {filteredCourses.map((course) => (
          <button
            key={course.id}
            type="button"
            className="search-result"
            onClick={() => {
              setQuery(course.code)
              onSelectCourse(course.code)
            }}
          >
            <strong>{course.code}</strong>
            <span>{course.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
