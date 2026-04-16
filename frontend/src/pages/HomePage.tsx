import { useNavigate } from 'react-router-dom'
import { SearchBar } from '../components/SearchBar'

export function HomePage() {
  const navigate = useNavigate()

  return (
    <main className="page-shell home-page">
      <section className="hero-card">
        <p className="eyebrow">UAlberta CMPUT Prerequisite Graph System</p>
        <h1>Explore prerequisite logic as a tree, not a flat graph.</h1>
        <p className="hero-copy">
          Search for a CMPUT course to load a left-to-right prerequisite view with
          logical group nodes such as ANY OF, ALL OF, and COREQ.
        </p>
        <SearchBar onSelectCourse={(courseCode) => navigate(`/graph/${courseCode}`)} />
      </section>
    </main>
  )
}
