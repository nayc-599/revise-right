/**
 * Serverless function: receives { topicName, notes, numQuestions },
 * calls Claude API, returns JSON array of QuizQuestion.
 * Deploy as Firebase Cloud Function or Netlify function.
 * Use env ANTHROPIC_API_KEY (never VITE_ in server).
 */
export interface GenerateQuizPayload {
  topicName: string;
  notes: string;
  numQuestions: number;
}

export interface QuizQuestionResult {
  question: string;
  options: string[];
  answer: string;
}

const PROMPT_TEMPLATE = (
  topicName: string,
  notes: string,
  numQuestions: number
) => `You are a study assistant. Based on the following notes for the topic "${topicName}", generate ${numQuestions} quiz questions.

Notes:
${notes}

Respond ONLY with a valid JSON array. No preamble, no markdown, no explanation. Format:
[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "answer": "A"
  }
]`;

export async function handleGenerateQuiz(
  payload: GenerateQuizPayload
): Promise<QuizQuestionResult[]> {
  const { topicName, notes, numQuestions } = payload;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const prompt = PROMPT_TEMPLATE(topicName, notes, numQuestions);
  void prompt; // Used when integrating Anthropic API
  // In a real deployment: call Anthropic API with prompt, parse JSON from response.
  const placeholder: QuizQuestionResult[] = [];
  return placeholder;
}
