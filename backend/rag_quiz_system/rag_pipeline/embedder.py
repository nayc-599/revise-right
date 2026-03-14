from sentence_transformers import SentenceTransformer

class Embedder:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
 
    def encode(self, text: str) -> list[float]:
        return self.model.encode(text).tolist()
 
    def encode_batch(self, texts: list[str], batch_size: int = 32) -> list[list[float]]:
        vectors = self.model.encode(texts, batch_size=batch_size)
        return [v.tolist() for v in vectors]