import { extractJson, getCompletionText } from "@/lib/ai-client";
import { MOCK_QUESTIONNAIRE } from "@/lib/mock-data";
import type { QuestionnaireQuestion } from "@/lib/types";

type RequestBody = {
  topicName: string;
  questionTypeName: string;
  sourceExcerpt?: string;
};

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
but wrong, not silly). The goal is to surface what the student already knows vs where
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
      return Response.json({ questions: MOCK_QUESTIONNAIRE });
    }

    const parsed = extractJson<{ questions: QuestionnaireQuestion[] }>(text);
    return Response.json(parsed);
  } catch (err) {
    console.error("Questionnaire generation failed", err);
    return Response.json({ error: "Questionnaire generation failed." }, { status: 502 });
  }
}
