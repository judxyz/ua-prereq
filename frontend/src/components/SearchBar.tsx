import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { fetchCourses } from '../api/courses'
import { formatCourseCodeForDisplay } from '../lib/courseCode'
import type { CourseSearchItem } from '../types/course'

interface SearchBarProps {
  onSelectCourse: (courseCode: string) => void
  initialValue?: string
}

export function SearchBar({ onSelectCourse, initialValue = '' }: SearchBarProps) {
  const [query, setQuery] = useState(formatCourseCodeForDisplay(initialValue))
  const [courses, setCourses] = useState<CourseSearchItem[]>([])
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

    if (normalized.length < 2) {
      return []
    }

    return courses
      .filter((course) => {
        const code = course.code.toLowerCase()
        const title = course.title.toLowerCase()

        return code.includes(normalized) || title.includes(normalized)
      })
      .slice(0, 8)
  }, [courses, query])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      return
    }

    setIsOpen(false)
    onSelectCourse(formatCourseCodeForDisplay(trimmedQuery))
  }

  function handleSelectCourse(course: CourseSearchItem) {
    setQuery(course.code)
    setIsOpen(false)
    onSelectCourse(formatCourseCodeForDisplay(course.code))
  }

  return (
    <section ref={searchRef} className="search-block" aria-label="Course search">
      <form className="search-form" role="search" onSubmit={handleSubmit}>
        <div className="search-input-shell">
          <label htmlFor="course-search-input" className="search-prefix">
            Map course:
          </label>
          <input
            id="course-search-input"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="CMPUT 272"
            aria-label="Search for a course code"
            aria-expanded={isOpen}
            aria-controls="course-search-results"
            className="search-form-input"
            autoComplete="off"
          />
          <button type="submit" className="search-form-button">
            Map
          </button>
        </div>
      </form>
      {error ? <p className="search-error">{error}</p> : null}
      {isOpen && filteredCourses.length > 0 ? (
        <div id="course-search-results" className="search-results" role="listbox">
          {filteredCourses.map((course) => (
            <button
              key={course.code}
              type="button"
              onClick={() => handleSelectCourse(course)}
              className="search-result-button"
            >
              <span className="search-result-code">{course.code}</span>
              <span className="search-result-title">{course.title}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
