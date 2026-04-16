import { Navigate, Route, Routes } from 'react-router-dom'
import { GraphPage } from './pages/GraphPage'
import { HomePage } from './pages/HomePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/graph/:code" element={<GraphPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
