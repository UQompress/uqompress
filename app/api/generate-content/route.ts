import { extractJson, getCompletionText, stripLatex } from "@/lib/ai-client";
import { contentGuidePromptBlock } from "@/lib/content-guide";
import type { GeneratedContent, QuestionnaireAnswer } from "@/lib/types";

function sanitizeContent(content: GeneratedContent): GeneratedContent {
  return {
    sources: (content.sources ?? []).map(stripLatex),
    theory: content.theory.map(stripLatex),
    sampleExamples: content.sampleExamples.map(stripLatex),
    commonErrors: content.commonErrors.map(stripLatex),
  };
}

type RequestBody = {
  topicName: string;
  questionTypeName: string;
  sourceExcerpt?: string;
  sourceFileNames?: string[];
  answers?: QuestionnaireAnswer[];
  existingContent?: GeneratedContent;
};

export async function POST(request: Request) {
  const { topicName, questionTypeName, sourceExcerpt, sourceFileNames, answers, existingContent } =
    (await request.json()) as RequestBody;

  if (!topicName || !questionTypeName) {
    return Response.json({ error: "Missing topic or question type." }, { status: 400 });
  }

  const answersBlock =
    answers && answers.length > 0
      ? `The student answered a diagnostic quiz about this question type:\n${answers
          .map((a) => `- ${a.questionId}: "${a.answer}"`)
          .join("\n")}\nUse these answers to bias "commonErrors" toward the mistakes their answers suggest they're prone to.`
      : "The student skipped the diagnostic quiz — infer common errors from the source material alone.";

  const citationSources =
    sourceFileNames && sourceFileNames.length > 0
      ? sourceFileNames.join(", ")
      : "the uploaded course material";

  const hasExisting =
    existingContent &&
    (existingContent.theory.length > 0 ||
      existingContent.sampleExamples.length > 0 ||
      existingContent.commonErrors.length > 0);
  const existingBlock = hasExisting
    ? `The student already has these fragments on their cheat sheet — generate NEW ones that
don't repeat or closely paraphrase any of these (different facts / a different worked
example / different mistakes, not just reworded):
Existing sources: ${existingContent!.sources.join(" | ") || "(none)"}
Existing theory: ${existingContent!.theory.join(" | ") || "(none)"}
Existing sampleExamples: ${existingContent!.sampleExamples.join(" | ") || "(none)"}
Existing commonErrors: ${existingContent!.commonErrors.join(" | ") || "(none)"}\n`
    : "";

  const prompt = `${contentGuidePromptBlock()}Draft cheat sheet content for this exam question type.

Topic: ${topicName}
Question type: ${questionTypeName}
${sourceExcerpt ? `Source excerpt: ${sourceExcerpt}\n` : ""}
Uploaded source files this content may cite: ${citationSources}
${existingBlock}${answersBlock}

Apply the guide's writing rules (§1, §4, §6) to every fragment. Each fragment must use
the card format from §1: "[Concept Name]: body" — label is the actual concept name, never a
narrator lead-in. Run the §10 self-check on every fragment before returning. Prefer dense,
exam-usable detail over vague summaries: preserve the reasoning chain, not just the answer.

This endpoint returns a simplified JSON shape (not the full §9 schema). Map guide content
into these three categories:

- theory ("Key Theory"): 8-12 fragments. Each is one concept card — "[Label]: body", one
  concept per fragment, split bundled concepts, and stay within the guide's §4 word budget.
  Build detailed coverage across separate cards: definition/governing principle, recognition
  cue, exact formula or notation, algorithm/method steps, required conditions, comparisons,
  and edge or boundary cases. Preserve exact course vocabulary and notation (§4). Prefer
  uploaded sources; web lookup only when §6 permits. No citation tags inline and no repeated
  facts across cards.
- sampleExamples ("Example Question & Solution"): exactly TWO fragments using the "example"
  card style from §5. Each must be a different representative exam pattern and contain a
  compact question skeleton plus labelled "Method:", "Working:", "Answer:", and "Check:"
  lines joined with "\\n". Show enough intermediate reasoning to reproduce the method; do not
  jump directly from the question to the answer. No citation tags inline.
- commonErrors ("Common Errors"): 3-5 fragments using the "error" card style from §5. Name
  the misconception and state the correction within the guide's §4 word budget; include a
  compact diagnostic cue where space permits. Include source-specific boundary cases when
  available. No "Don't" openers and no citation tags inline.

CITATION: list every source used across all categories in the top-level "sources" array (one
entry per source, deduped). Uploaded files: name + optional page/section. Web sources: only
when §6 permits, with label and URL if known. Leave empty only if everything is from general
knowledge with no identifiable source.

FORMATTING: plain text only — no LaTeX, markdown, or HTML in fragment text. Use Unicode
symbols (×, ÷, ±, ≤, ≥, √, π, →) instead of LaTeX. This app renders fragments as plain text.

Return ONLY a JSON object, no prose before or after it, no markdown code fences, shaped
exactly like this:
{"sources": string[], "theory": string[], "sampleExamples": string[], "commonErrors": string[]}`;

  try {
    const text = await getCompletionText(prompt, 4096);
    const parsed = extractJson<GeneratedContent>(text);
    return Response.json(sanitizeContent(parsed));
  } catch (err) {
    console.error("Content generation failed", err);
    return Response.json(
      { error: "Content generation failed after retrying the AI provider." },
      { status: 502 },
    );
  }
}
