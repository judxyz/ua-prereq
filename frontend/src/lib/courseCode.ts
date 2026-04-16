export function normalizeCourseCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, ' ')
}

export function formatCourseCodeForRoute(value: string) {
  return normalizeCourseCode(value).replace(/\s+/g, '-')
}

export function formatCourseCodeForDisplay(value: string) {
  return normalizeCourseCode(value)
}
