import { useEffect, useState } from 'react'
// 1. Define the shape of your backend response
interface BackendResponse {
  status: string;
  message: string;
}

function App() {
  // 2. Tell useState to expect either the interface or null
  const [data, setData] = useState<BackendResponse | null>(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/health')
      .then((res) => res.json())
      .then((json: BackendResponse) => setData(json)) // 3. Cast the result
      .catch((err) => console.error(err));
  }, []); // trigger that reruns code, runs only once bc of []

  return (
    // this all is JSX looks like HTML
    <div>
      {/* TypeScript now knows 'message' exists on 'data' */}
      {data && <p>{data.message}</p>}
    </div>
  );
}

export default App;


/**
 * App starts: data is null. The return shows "Connecting..."
useEffect kicks in: It reaches out to your FastAPI backend.
Data arrives: You call setData(json).
React notices: Because you used setData, React knows the "box" changed. It automatically runs the App function again.
Re-render: This time, data is full, so the return shows the message from the backend.
 */