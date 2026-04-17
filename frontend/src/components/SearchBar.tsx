import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
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
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [])

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
    <div ref={searchRef} className="search-block">
      <form className="search-form" role="search" onSubmit={handleSubmit}>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search CMPUT course code or title"
          aria-label="Search CMPUT course"
          aria-expanded={isOpen}
          aria-controls="course-search-results"
          className="search-form-input"
        />

      </form>
      {error ? <p className="search-error app-muted-text">{error}</p> : null}
      {isOpen && filteredCourses.length > 0 ? (
        <div id="course-search-results" className="search-results" role="listbox">
          {filteredCourses.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => {
                setQuery(course.code)
                setIsOpen(false)
                onSelectCourse(formatCourseCodeForDisplay(course.code))
              }}
              className="search-result-button"
            >
              <strong>{course.code}</strong>
              <span className="app-muted-text">{course.title}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
