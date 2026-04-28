import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { trackPageView } from './lib/analytics'
import { GraphPage } from './pages/GraphPage'

function RouteAnalytics() {
  const location = useLocation()

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`)
  }, [location.pathname, location.search])

  return null
}

function App() {
  return (
    <>
      <RouteAnalytics />
      <Routes>
        <Route path="/" element={<GraphPage />} />
        <Route path="/graph/:code" element={<GraphPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
