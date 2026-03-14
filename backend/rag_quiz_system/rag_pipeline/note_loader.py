import sqlite3

class NoteLoader:
    def __init__(self, df_path: str):
        self.conn = sqlite3.connect(df_path)
    
    def fetch_notes(self, course):
        cur = self.conn.cursor()
        cur.execute(("SELECT content, file_path FROM notes WHERE course=?"), (course,))
        return cur.fetchall()

    def close(self):
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
    

