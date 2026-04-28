import os
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# app.py requires DATABASE_URL at import time.
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
