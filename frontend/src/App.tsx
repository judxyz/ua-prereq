import { Navigate, Route, Routes } from 'react-router-dom'
import { GraphPage } from './pages/GraphPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<GraphPage />} />
      <Route path="/graph/:code" element={<GraphPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
