import { extractJson, getCompletionText, stripLatex } from "@/lib/ai-client";
import type { QuestionnaireQuestion } from "@/lib/types";

// Defense in depth against stray LaTeX: some backslash commands (\rightarrow,
// \neg, \frac, \tan, ...) start with a letter JSON itself treats as a valid
// escape (\r \n \f \t), so a raw JSON.parse silently swallows the backslash
// and that letter instead of throwing — no error to catch, just corrupted
// text ("\rightarrow" -> "ightarrow"). The prompt below is the real fix
// (stop the model emitting LaTeX at all); this only mops up survivors.
function sanitizeQuestions(questions: QuestionnaireQuestion[]): QuestionnaireQuestion[] {
  return questions.map((q) => ({
    ...q,
    question: stripLatex(q.question),
    options: q.options.map(stripLatex),
    correctAnswer: stripLatex(q.correctAnswer),
    explanation: stripLatex(q.explanation),
  }));
}

type RequestBody = {
  topicName: string;
  questionTypeName: string;
  sourceExcerpt?: string;
};

// Models skew toward putting the correct answer first, so shuffle each
// question's options server-side to guarantee an unpredictable position.
// Safe because the UI matches answers by string value, not by index.
function shuffleOptions(questions: QuestionnaireQuestion[]): QuestionnaireQuestion[] {
  return questions.map((q) => {
    const options = [...q.options];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return { ...q, options };
  });
}

export async function POST(request: Request) {
  const { topicName, questionTypeName, sourceExcerpt } = (await request.json()) as RequestBody;

  if (!topicName || !questionTypeName) {
    return Response.json({ error: "Missing topic or question type." }, { status: 400 });
  }

  const prompt = `A student is about to build a cheat sheet entry for this exam question type:

Topic: ${topicName}
Question type: ${questionTypeName}
${sourceExcerpt ? `Example from past materials: ${sourceExcerpt}\n` : ""}
Write exactly 5 multiple-choice questions (4 options each) that probe the student's
understanding of the THEORY behind this question type and the METHOD used to solve it. Each
question has one clearly correct answer among the 4 options (the others should be plausible
but wrong, not silly). Vary which position (1st/2nd/3rd/4th) holds the correct answer across
the 5 questions — don't default to always putting it first. The goal is to surface what the
student already knows vs where
they're weak, so the cheat sheet content can be personalised — and give correct/incorrect
feedback as they go, so pick genuinely correct answers, not opinion questions.

For each question also write a one-sentence explanation of why the correct answer is
correct, to show the student immediately after they answer.

FORMATTING: plain text only — no LaTeX or backslash notation of any kind (no "\rightarrow",
"\neg", "\frac{a}{b}", "\times", etc.). Use Unicode symbols directly instead (→, ¬, ×, ÷, ±,
≤, ≥, √, π, ∀, ∃, ∈), or plain notation like "x^2" / "a/b". This app renders questions as
plain text with no math renderer, and LaTeX also risks corruption when read back as JSON.

Return ONLY a JSON object, no prose before or after it, no markdown code fences, shaped
exactly like this:
{"questions": [{"id": string, "question": string, "options": string[4], "correctAnswer": string, "explanation": string}]}
"correctAnswer" must exactly match one of the 4 strings in "options".`;

  try {
    const text = await getCompletionText(prompt, 2048);
    const parsed = extractJson<{ questions: QuestionnaireQuestion[] }>(text);
    return Response.json({ questions: shuffleOptions(sanitizeQuestions(parsed.questions)) });
  } catch (err) {
    console.error("Questionnaire generation failed", err);
    return Response.json(
      { error: "Questionnaire generation failed after retrying the AI provider." },
      { status: 502 },
    );
  }
}
