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

    if (normalized.length < 4) {
      return []
    }

    return courses
      .filter((course) => course.code.toLowerCase().includes(normalized))
      .slice(0, 5)
  }, [courses, query])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!query.trim()) {
      return
    }

    onSelectCourse(formatCourseCodeForDisplay(query))
  }

  return (
    <section ref={searchRef} className="search-block">
      <h3>Search for a course:</h3>
      <form className="search-form" role="search" onSubmit={handleSubmit}>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search course code"
          aria-label="Search CMPUT course"
          aria-expanded={isOpen}
          aria-controls="course-search-results"
          className="search-form-input"
        />
        <button type="submit" className="search-form-button">
          Search
        </button>
      </form>
      {error ? <p className="search-error">{error}</p> : null}
      {isOpen && query.trim().length >= 4 && filteredCourses.length > 0 ? (
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
              <span>{course.code}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
