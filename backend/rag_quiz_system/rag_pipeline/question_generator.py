import json
from openai import OpenAI
import time

class QuestionGenerator:
    def __init__(self, model: str = "phi"):
        self.client = OpenAI(
            base_url="http://localhost:11434/v1",
            api_key="ollama",
        )
        self.model = model

    @staticmethod
    def _trim_context(chunks: list[dict], token_budget: int = 3000) -> str:
        
        lines: list[str] = []
        remaining = token_budget
        
        for doc in chunks:
            text = doc["text"]
            estimated = int(len(text) * 0.25)
            
            if estimated > remaining:
                lines.append(text[: int(remaining / 0.25)])
                break
            
            lines.append(text)
            remaining -= estimated
        
        return "\n\n".join(lines)
    
    def generate_questions(
        self,
        chunks: list[dict],
        n_questions: int = 5,
        q_type: str = "multiple_choice",
    ) -> list[dict]:
        
        context = self._trim_context(chunks)
        prompt = (
            f"Generate {n_questions} multiple choice questions based on the notes below.\n"
            "Respond with ONLY a single JSON array. No extra text after the array.\n"
            "Each object MUST have exactly these 3 keys:\n"
            "  'question': string\n"
            "  'options': list of EXACTLY 4 strings labelled A, B, C, D\n"
            "  'answer': the full text of the correct option\n\n"
            "Example:\n"
            '[\n'
            '  {\n'
            '    "question": "What is X?",\n'
            '    "options": ["A) option one", "B) option two", "C) option three", "D) option four"],\n'
            '    "answer": "A) option one"\n'
            '  }\n'
            ']\n\n'
            f"Notes:\n{context}\n\n"
            "Respond with the JSON array only. Every object must have question, options and answer."
        )

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )

        raw = response.choices[0].message.content.strip()
        # Log raw LLM output for debugging
        print("[quiz] Raw LLM response:", raw, flush=True)

        # Attempt 1: extract JSON array between first '[' and last ']'
        cleaned = raw
        start = raw.find('[')
        end = raw.rfind(']')
        if start != -1 and end != -1 and end > start:
            candidate = raw[start : end + 1]
            try:
                questions: list[dict] = json.loads(candidate)
                return questions
            except json.JSONDecodeError:
                pass

        # Attempt 2: strip markdown code fences like ```json ... ``` or ``` ... ```
        fenced = raw.strip()
        if fenced.startswith("```"):
            # remove leading ``` or ```json
            fenced = fenced.split("\n", 1)[-1]
        if fenced.endswith("```"):
            fenced = fenced.rsplit("```", 1)[0].strip()
        try:
            questions = json.loads(fenced)
            return questions
        except json.JSONDecodeError:
            pass

        # Attempt 3: fall back to original raw string
        try:
            questions = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"LLM returned non-JSON: {exc}\n\nRaw:\n{raw}"
            ) from exc
 
        return questions
    
    def generate_with_retry(
        self,
        chunks: list[dict],
        n_questions: int = 3,
        retries: int = 3,
    ) -> list[dict]:
        for attempt in range(retries):
            try:
                return self.generate_questions(chunks, n_questions)
            except ValueError as exc:
                print(f"Attempt {attempt + 1} failed: {exc}")
                if attempt < retries - 1:
                    time.sleep(1)
        raise ValueError("Failed to generate questions after 3 attempts.")