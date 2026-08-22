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

  const prompt = `Draft condensed cheat sheet content for this exam question type, written for a
student who is new to this topic — clear and easy to understand, not just dense jargon.

Topic: ${topicName}
Question type: ${questionTypeName}
${sourceExcerpt ? `Source excerpt: ${sourceExcerpt}\n` : ""}
${answersBlock}

Organise the output into exactly three categories, each with its own voice and purpose:

- theory: 2-4 short fragments summarising the KEY POINTS only — the minimum a student needs
  to recognise and start this question type. Plain language, no unexplained jargon, each
  fragment short enough to fit on a physical cheat sheet.
- sampleExamples: walk through ONE specific, concrete worked example end-to-end as a
  sequence of short numbered-step fragments (e.g. "Step 1: ...", "Step 2: ..."), showing the
  actual approach applied to real numbers/data, not just an abstract description of the
  method. Invent a small concrete example if the source material doesn't give one.
  Each step is its own array item.
- commonErrors: 1-3 fragments in a casual, engaging, slightly conversational tone (like a
  friend giving you a heads-up before the exam), each naming ONE specific mistake to avoid.

Each array item should be its own standalone draggable fragment, short enough to paste onto
a physical cheat sheet.

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
