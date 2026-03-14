import chromadb

class ChromaStore:
    def __init__(self, path="./chroma_db"):
        self.client = chromadb.PersistentClient(path=path)
        self.collection = self.client.get_or_create_collection(
            name="notes_rag",
            metadata={"hgef:space": "cosine"}
        )

    def delete_by_course(self, course):
        self.collection.delete(where={"course": course})

    def index_chunks(self, chunks, embeddings, course):
        self.collection.add(
            ids=[f"{course}_{i}" for i in range(len(chunks))],
            documents=[c.page_content for c in chunks],
            embeddings=embeddings,
            metadatas=[{"course": course, **c.metadata} for c in chunks],
        )

    def search(self, query_embedding, course, top_n=10):
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_n,
            where={"course": course},
        )
        return [
            {"text": doc, "metadata": meta}
            for doc, meta in zip(
                results["documents"][0],
                results["metadatas"][0],
            )
        ]
