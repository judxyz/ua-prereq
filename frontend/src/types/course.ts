export type CourseNumber = string | number

export type ParseStatus = 'parsed' | 'partial' | 'unparsed'

export interface CourseSummary {
  id: number
  code: string
  subject: string
  number: CourseNumber
  title: string
  parseStatus: ParseStatus
}

export interface RootCourse extends CourseSummary {
  description: string | null
  otherNotes: string | null
  catalogUrl: string | null
}
