from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


class Chunker:
    DENSE_PATTERNS = ("{", "def ", "class ", "SELECT ", "| ", "$$")
 
    def __init__(self, default_chunk_size: int = 500, overlap: int = 100):
        self.default_size = default_chunk_size
        self.overlap = overlap
 
    def _is_dense(self, text: str) -> bool:
        return any(p in text for p in self.DENSE_PATTERNS)
 
    def _make_splitter(self, chunk_size: int) -> RecursiveCharacterTextSplitter:
        return RecursiveCharacterTextSplitter(
            chunk_size=chunk_size, chunk_overlap=self.overlap
        )
 
    def split(self, documents: list[tuple[str, str]], course: str) -> list[Document]:
        raw_docs: list[Document] = []
        for content, file_path in documents:
            if content:
                raw_docs.append(
                    Document(
                        page_content=content,
                        metadata={"source": file_path or "db", "page": 0},
                    )
                )
            elif file_path and Path(file_path).exists():
                raw_docs.extend(PyPDFLoader(file_path).load())
 
        chunks: list[Document] = []
        for idx, doc in enumerate(raw_docs):
            size = 250 if self._is_dense(doc.page_content) else self.default_size
            for chunk in self._make_splitter(size).split_documents([doc]):
                chunk.metadata.update({"course": course, "chunk_index": idx})
                chunks.append(chunk)
 
        return chunks