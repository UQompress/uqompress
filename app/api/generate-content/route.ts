import { extractJson, getCompletionText } from "@/lib/ai-client";
import { mockGeneratedContent } from "@/lib/mock-data";
import type { GeneratedContent, QuestionnaireAnswer } from "@/lib/types";

type RequestBody = {
  topicName: string;
  questionTypeName: string;
  sourceExcerpt?: string;
  answers?: QuestionnaireAnswer[];
};

export async function POST(request: Request) {
  const { topicName, questionTypeName, sourceExcerpt, answers } =
    (await request.json()) as RequestBody;

  if (!topicName || !questionTypeName) {
    return Response.json({ error: "Missing topic or question type." }, { status: 400 });
  }

  const answersBlock =
    answers && answers.length > 0
      ? `The student answered a diagnostic questionnaire about this question type:\n${answers
          .map((a) => `- ${a.questionId}: "${a.answer}"`)
          .join("\n")}\nUse these answers to bias "commonErrors" toward the mistakes their answers suggest they're prone to.`
      : "The student skipped the diagnostic questionnaire — infer common errors from the source material alone.";

  const prompt = `Draft condensed cheat sheet content for this exam question type.

Topic: ${topicName}
Question type: ${questionTypeName}
${sourceExcerpt ? `Source excerpt: ${sourceExcerpt}\n` : ""}
${answersBlock}

Produce short, dense, exam-ready fragments suitable to paste directly onto a physical
cheat sheet — no filler phrasing. Organise them into exactly three categories:
- theory: the core definitions/rules/formulas needed
- sampleExamples: 1-2 short worked examples
- commonErrors: 1-2 specific mistakes to avoid

Each array item should be its own standalone draggable fragment (roughly 1-3 sentences).

Return ONLY a JSON object, no prose before or after it, no markdown code fences, shaped
exactly like this:
{"theory": string[], "sampleExamples": string[], "commonErrors": string[]}`;

  try {
    const text = await getCompletionText(prompt, 1024);
    if (text === null) {
      return Response.json(mockGeneratedContent(topicName, questionTypeName));
    }

    const parsed = extractJson<GeneratedContent>(text);
    return Response.json(parsed);
  } catch (err) {
    console.error("Content generation failed", err);
    return Response.json({ error: "Content generation failed." }, { status: 502 });
  }
}
