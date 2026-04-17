import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { fetchCourses } from '../api/courses'
import { formatCourseCodeForDisplay } from '../lib/courseCode'
import type { CourseSummary } from '../types/course'

interface SearchBarProps {
  onSelectCourse: (courseCode: string) => void
  initialValue?: string
}

export function SearchBar({ onSelectCourse, initialValue = '' }: SearchBarProps) {
  const [query, setQuery] = useState(formatCourseCodeForDisplay(initialValue))
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
    setQuery(formatCourseCodeForDisplay(initialValue))
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

    onSelectCourse(formatCourseCodeForDisplay(query))
  }

  return (
    <div style={{ display: 'grid', gap: '0.65rem', marginTop: '1rem' }}>
      <form
        role="search"
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.65rem',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search CMPUT course code or title"
          aria-label="Search CMPUT course"
          style={{ marginBottom: 0, flex: '1 1 28rem' }}
        />
        <button type="submit" style={{ marginBottom: 0 }}>
          Open graph
        </button>
      </form>
      {error ? <p className="search-error">{error}</p> : null}
      <div style={{ display: 'grid', gap: '0.4rem', maxWidth: '44rem' }}>
        {filteredCourses.map((course) => (
          <button
            key={course.id}
            type="button"
            onClick={() => {
              setQuery(course.code)
              onSelectCourse(formatCourseCodeForDisplay(course.code))
            }}
            style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: '7.5rem minmax(0, 1fr)',
              gap: '0.75rem',
              alignItems: 'center',
              textAlign: 'left',
              margin: 0,
              padding: '0.6rem 0.75rem',
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
