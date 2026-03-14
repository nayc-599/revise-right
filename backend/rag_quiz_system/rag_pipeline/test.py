# test_rag_quiz.py

import hashlib
from pathlib import Path

from pdf_uploader import upload_pdf
from note_loader import NoteLoader
from chunker import Chunker
from question_generator import QuestionGenerator
from chroma_store import ChromaStore
from sentence_transformers import SentenceTransformer  # for embeddings

# ----------------------
# CONFIG
# ----------------------
DB_PATH   = "/Users/naychi/Desktop/revise-write/rag_quiz_system/rag_pipeline/notes.db"
PDF_PATH  = "/Users/naychi/Desktop/revise-write/rag_quiz_system/FIT2179.pdf"
COURSE    = "FIT2179"

# ----------------------
# INITIALIZE COMPONENTS
# ----------------------
loader          = NoteLoader(DB_PATH)
chunker         = Chunker()
generator       = QuestionGenerator(model="phi3")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# Use your ChromaStore class
store = ChromaStore(path="./chroma_db")

# ----------------------
# UPLOAD PDF
# ----------------------
upload_pdf(DB_PATH, COURSE, PDF_PATH)
print(f"PDF uploaded successfully for course '{COURSE}'.")

# ----------------------
# FETCH + CHUNK NOTES
# ----------------------
notes = loader.fetch_notes(COURSE)
print("Notes fetched:", notes)

chunks = chunker.split(notes, course=COURSE)
print(f"Got {len(chunks)} chunks.")

if not chunks:
    print("No chunks found — check your PDF and NoteLoader.")
    exit(1)

# ----------------------
# GENERATE EMBEDDINGS
# ----------------------
chunk_texts = [c.page_content for c in chunks]
embeddings = embedding_model.encode(chunk_texts).tolist()
print(f"Generated {len(embeddings)} embeddings.")

# ----------------------
# INDEX CHUNKS IN CHROMA
# ----------------------
store.delete_by_course(COURSE)  # optional fresh start
store.index_chunks(chunks, embeddings, COURSE)
print("Chunks indexed in ChromaStore.")

# ----------------------
# RETRIEVE TOP CHUNKS FOR QUIZ
# ----------------------
query_text   = "Generate a quiz based on these notes."
query_vector = embedding_model.encode([query_text]).tolist()[0]

retrieved_chunks = store.search(
    query_embedding=query_vector,
    course=COURSE,
    top_n=5
)
print(f"Retrieved {len(retrieved_chunks)} chunks for quiz generation.")

if not retrieved_chunks:
    print("No chunks retrieved — check that indexing succeeded above.")
    exit(1)

# ----------------------
# GENERATE QUIZ
# ----------------------
quiz_questions = generator.generate_with_retry(
    chunks=retrieved_chunks,
    n_questions=5
)

if not quiz_questions:
    print("No questions generated — check your QuestionGenerator.")
    exit(1)

# ----------------------
# PRINT QUIZ
# ----------------------
for i, q in enumerate(quiz_questions, 1):
    print(f"\nQ{i}: {q['question']}")
    for option in q.get("options", []):
        print(f"  {option}")
    print(f"Answer: {q['answer']}")

from quiz_store import init_quiz_table, save_quiz


init_quiz_table()

saved_quiz = save_quiz(course=COURSE, questions=quiz_questions)

print("\nSaved quiz to database:")
for q in saved_quiz:
    print(f"ID: {q['id']}, Question: {q['question']}, Answer: {q['answer']}")