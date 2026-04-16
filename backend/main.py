"""Minimal FastAPI app used for a basic backend health check."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS for Vite (default port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    """Return a basic status message for frontend connectivity checks."""
    return {"status": "healthy", "message": "Backend is reachable!"}
