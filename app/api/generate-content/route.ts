import { extractJson, getCompletionText } from "@/lib/ai-client";
import { mockGeneratedContent } from "@/lib/mock-data";
import type { GeneratedContent, QuestionnaireAnswer } from "@/lib/types";

type RequestBody = {
  topicName: string;
  questionTypeName: string;
  sourceExcerpt?: string;
  sourceFileNames?: string[];
  answers?: QuestionnaireAnswer[];
};

export async function POST(request: Request) {
  const { topicName, questionTypeName, sourceExcerpt, sourceFileNames, answers } =
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

  const citationSources =
    sourceFileNames && sourceFileNames.length > 0
      ? sourceFileNames.join(", ")
      : "the uploaded course material";

  const prompt = `Draft cheat sheet content for this exam question type, written for a student
who is new to this topic — accurate, concise, and easy to understand, not dense jargon.

Topic: ${topicName}
Question type: ${questionTypeName}
${sourceExcerpt ? `Source excerpt: ${sourceExcerpt}\n` : ""}
Uploaded source files this content may cite: ${citationSources}
${answersBlock}

Organise the output into exactly three categories, each with its own voice and purpose:

- theory ("Key Theory"): 2-4 short fragments summarising ONLY the key points — the minimum
  a student needs to recognise and start this question type. Every fact must be directly
  verifiable against the source excerpt above (do not invent facts not supported by it).
  Plain language, no unexplained jargon.
- sampleExamples ("Example Question & Solution"): restate or adapt ONE concrete question of
  this type, then walk through the solution as short numbered steps, then give one worked
  "Example Answer" — e.g. "Question: ...", "Step 1: ...", "Step 2: ...", "Example Answer:
  ...". Use real, specific numbers/data, not an abstract description. Invent a small
  concrete example if the source material doesn't give one, but say so implicitly by not
  citing a source for that fragment.
- commonErrors ("Common Errors"): 1-3 fragments in a casual, engaging, conversational tone
  (like a friend giving you a heads-up before the exam), each naming ONE specific mistake to
  avoid. A single error can have a short heading line followed by "\\n"-separated sub-points
  if it naturally breaks into parts.

CITATION: every fragment that states a fact FROM the source material must end with a
citation tag in this exact format: " [<short file name>(<page or section if known>) | PDF]"
— e.g. " [Module 0 Introduction(1) | PDF]". Use one of the uploaded file names listed above
(shortened is fine, e.g. drop the extension). Only omit the citation on an invented example
fragment that isn't drawn from the source.

Each array item is its own standalone draggable fragment, short enough to paste onto a
physical cheat sheet.

Return ONLY a JSON object, no prose before or after it, no markdown code fences, shaped
exactly like this:
{"theory": string[], "sampleExamples": string[], "commonErrors": string[]}`;

  try {
    const text = await getCompletionText(prompt, 1536);
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
