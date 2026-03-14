"""
RAG Quiz Pipeline: PDF bytes → chunk → embed → store → search → LLM → 10 questions.
Uses existing modules in rag_pipeline; does not modify their logic.
"""
import tempfile
import re
from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader

# Import from rag_pipeline (same package, subfolder) using relative imports
from .rag_pipeline.chunker import Chunker
from .rag_pipeline.embedder import Embedder
from .rag_pipeline.chroma_store import ChromaStore
from .rag_pipeline.question_generator import QuestionGenerator
from .rag_pipeline.note_loader import NoteLoader  # kept for completeness
from .rag_pipeline.pdf_uploader import upload_pdf  # kept for completeness


def _normalize_question(q: dict) -> dict:
    """Ensure question has question, options (4 items), answer as single letter A/B/C/D."""
    question = q.get("question", "")
    options = q.get("options", [])
    answer = q.get("answer", "")

    # Extract letter from answer if it's "A) something" style
    if answer and len(answer) >= 1:
        letter = answer.strip()[0].upper()
        if letter in "ABCD":
            answer = letter
    if answer not in "ABCD" and options:
        for i, opt in enumerate(options):
            if opt and str(opt).strip().upper().startswith(answer):
                answer = "ABCD"[i] if i < 4 else "A"
                break

    # Ensure exactly 4 options; if fewer, pad with empty strings
    while len(options) < 4:
        options.append("")
    options = options[:4]

    return {"question": question, "options": options, "answer": answer}


def run_quiz_pipeline(pdf_bytes: bytes) -> list[dict]:
    """
    Accept PDF bytes, run full RAG pipeline, return exactly 10 questions
    in format [{"question": str, "options": ["A","B","C","D"], "answer": "A"}, ...].
    """
    course = "run"
    print("[quiz] Starting run_quiz_pipeline; bytes length:", len(pdf_bytes), flush=True)

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name

    try:
        print("[quiz] Temporary PDF written to:", tmp_path, flush=True)
        print("[quiz] Loading PDF pages with PyPDFLoader...", flush=True)
        loader = PyPDFLoader(tmp_path)
        raw_docs = loader.load()
        print(f"[quiz] Loaded {len(raw_docs)} document pages from PDF.", flush=True)
    finally:
        Path(tmp_path).unlink(missing_ok=True)
        print("[quiz] Temporary PDF removed.", flush=True)

    if not raw_docs:
        print("[quiz] No documents loaded from PDF; returning empty list.", flush=True)
        return []

    documents = [(doc.page_content, tmp_path) for doc in raw_docs]
    print("[quiz] Initialising Chunker and splitting into chunks...", flush=True)
    chunker = Chunker(default_chunk_size=500, overlap=100)
    chunks = chunker.split(documents, course)
    print(f"[quiz] Chunking complete; total chunks: {len(chunks)}", flush=True)

    if not chunks:
        print("[quiz] No chunks produced; returning empty list.", flush=True)
        return []

    print("[quiz] Initialising Embedder and computing embeddings...", flush=True)
    embedder = Embedder()
    texts = [c.page_content for c in chunks]
    embeddings = embedder.encode_batch(texts)
    print(f"[quiz] Embeddings computed for {len(embeddings)} chunks.", flush=True)

    print("[quiz] Initialising ChromaStore and indexing chunks...", flush=True)
    store = ChromaStore(path="./chroma_db")
    store.delete_by_course(course)
    store.index_chunks(chunks, embeddings, course)
    print("[quiz] Chroma index updated.", flush=True)

    print("[quiz] Computing query embedding and searching top-10 chunks...", flush=True)
    query = "Key concepts and facts for generating quiz questions."
    query_embedding = embedder.encode(query)
    results = store.search(query_embedding, course, top_n=10)
    print(f"[quiz] Vector search returned {len(results)} results.", flush=True)

    if not results:
        print("[quiz] No results from vector search; returning empty list.", flush=True)
        return []

    print("[quiz] Calling QuestionGenerator via LLM (Ollama)...", flush=True)
    generator = QuestionGenerator()
    raw_questions = generator.generate_with_retry(results, n_questions=5, retries=3)
    print(f\"[quiz] LLM returned {len(raw_questions)} raw questions.\", flush=True)

    out = []
    for q in raw_questions[:5]:
        out.append(_normalize_question(q))
    print(f\"[quiz] Normalised questions count: {len(out)}. Returning to API.\", flush=True)
    return out
