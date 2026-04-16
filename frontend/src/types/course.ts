export interface CourseSummary {
  id: number
  code: string
  subject: string
  number: string | number
  title: string
  parseStatus: string
}

export interface RootCourse extends CourseSummary {
  description: string | null
  otherNotes: string | null
  catalogUrl: string | null
}
