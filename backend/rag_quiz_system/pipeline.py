"""
RAG Quiz Pipeline: PDF bytes → chunk → embed → store → search → LLM → 10 questions.
Uses existing modules in rag_pipeline; does not modify their logic.
"""
import tempfile
import re
from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader

# Import from rag_pipeline (same package, subfolder)
from rag_pipeline.chunker import Chunker
from rag_pipeline.embedder import Embedder
from rag_pipeline.chroma_store import ChromaStore
from rag_pipeline.question_generator import QuestionGenerator


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
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name

    try:
        loader = PyPDFLoader(tmp_path)
        raw_docs = loader.load()
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if not raw_docs:
        return []

    documents = [(doc.page_content, tmp_path) for doc in raw_docs]
    chunker = Chunker(default_chunk_size=500, overlap=100)
    chunks = chunker.split(documents, course)

    if not chunks:
        return []

    embedder = Embedder()
    texts = [c.page_content for c in chunks]
    embeddings = embedder.encode_batch(texts)

    store = ChromaStore(path="./chroma_db")
    store.delete_by_course(course)
    store.index_chunks(chunks, embeddings, course)

    query = "Key concepts and facts for generating quiz questions."
    query_embedding = embedder.encode(query)
    results = store.search(query_embedding, course, top_n=10)

    if not results:
        return []

    generator = QuestionGenerator()
    raw_questions = generator.generate_with_retry(results, n_questions=10, retries=3)

    out = []
    for q in raw_questions[:10]:
        out.append(_normalize_question(q))
    return out
