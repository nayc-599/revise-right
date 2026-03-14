import sqlite3
import shutil
from pathlib import Path

UPLOAD_DIR = Path("uploads")

def upload_pdf(db_path: str, course: str, file_path: str):
    UPLOAD_DIR.mkdir(exist_ok=True)

    source = Path(file_path)
    if not source.exists():
        raise FileNotFoundError(f"No file found at {file_path}")
    if source.suffix.lower() != ".pdf":
        raise ValueError(f"Expected a PDF, got {source.suffix}")

    destination = UPLOAD_DIR / source.name
    shutil.copy2(source, destination)

    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course TEXT,
            content TEXT,
            file_path TEXT
        )
    """)
    conn.execute(
        "INSERT INTO notes (course, content, file_path) VALUES (?, NULL, ?)",
        (course, str(destination))
    )
    conn.commit()
    conn.close()
    print(f"Uploaded {source.name} for course '{course}'.")