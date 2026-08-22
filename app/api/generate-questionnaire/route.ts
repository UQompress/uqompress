import { extractJson, getCompletionText } from "@/lib/ai-client";
import { MOCK_QUESTIONNAIRE } from "@/lib/mock-data";
import type { QuestionnaireQuestion } from "@/lib/types";

type RequestBody = {
  topicName: string;
  questionTypeName: string;
  sourceExcerpt?: string;
};

// Models (and the hardcoded mock set) skew toward putting the correct answer
// first, so most questions end up with the same answer position — shuffle
// each question's options server-side to guarantee an unpredictable position
// regardless of source. Safe because the UI matches answers by string value
// (option === question.correctAnswer), not by index.
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

Return ONLY a JSON object, no prose before or after it, no markdown code fences, shaped
exactly like this:
{"questions": [{"id": string, "question": string, "options": string[4], "correctAnswer": string, "explanation": string}]}
"correctAnswer" must exactly match one of the 4 strings in "options".`;

  try {
    const text = await getCompletionText(prompt, 2048);
    if (text === null) {
      return Response.json({ questions: shuffleOptions(MOCK_QUESTIONNAIRE) });
    }

    const parsed = extractJson<{ questions: QuestionnaireQuestion[] }>(text);
    return Response.json({ questions: shuffleOptions(parsed.questions) });
  } catch (err) {
    console.error("Questionnaire generation failed", err);
    return Response.json({ error: "Questionnaire generation failed." }, { status: 502 });
  }
}
