import { extractJson, getCompletionText, stripLatex } from "@/lib/ai-client";
import { mockGeneratedContent } from "@/lib/mock-data";
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
      ? `The student answered a diagnostic questionnaire about this question type:\n${answers
          .map((a) => `- ${a.questionId}: "${a.answer}"`)
          .join("\n")}\nUse these answers to bias "commonErrors" toward the mistakes their answers suggest they're prone to.`
      : "The student skipped the diagnostic questionnaire — infer common errors from the source material alone.";

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

  const prompt = `Draft cheat sheet content for this exam question type, written for a student
who is new to this topic — accurate, concise, and easy to understand, not dense jargon.

Topic: ${topicName}
Question type: ${questionTypeName}
${sourceExcerpt ? `Source excerpt: ${sourceExcerpt}\n` : ""}
Uploaded source files this content may cite: ${citationSources}
${existingBlock}${answersBlock}

FORMATTING (applies to every fragment in every category, including any formula quoted from
the source excerpt itself): write ALL math in plain text only — e.g. "O(n log n)", "n^2",
"sqrt(x)", "(-b ± sqrt(b^2 - 4ac)) / 2a", "sum of i from 1 to n". Never LaTeX or backslash
escape notation of any kind — no "\\log", "\\times", "\\frac{a}{b}", "\\sqrt{x}", "\\sum",
"\\alpha", "$...$", or similar — even if the source excerpt itself contains LaTeX, translate
it to plain text/Unicode symbols (×, ÷, ±, ≤, ≥, √, π, etc. are fine to use directly) rather
than copying the markup. This app renders fragments as plain text with no math renderer, so
raw LaTeX shows up as broken gibberish.

Organise the output into exactly three categories, each with its own voice and purpose:

- theory ("Key Theory"): 4-6 fragments, each 1-2 sentences long. Every fragment must be
  specific and meaningful — a concrete formula, definition, theorem, or actionable tip tied
  to this exact topic and question type — never a generic statement that could apply to any
  topic (e.g. never something like "Understand the core concept before attempting
  questions."). Plain language, no unexplained jargon.
  If the source excerpt above gives enough theory (formulas, definitions, tips, theorems) to
  fill these fragments, base them on it. If it doesn't (excerpt is thin, missing, or doesn't
  cover the theory this question type needs), fill the gap using well-established knowledge
  from trusted external sources on this subject (standard textbook definitions, canonical
  formulas, reputable references like Wikipedia, MIT OpenCourseWare, Khan Academy, etc.) —
  do not leave theory generic or thin just because the excerpt is sparse.
  No citation tags inside theory fragment text itself (see CITATION below) — instead, list
  every source that backed a theory fragment (uploaded file OR external source) in the
  top-level "sources" array.
- sampleExamples ("Example Question & Solution"): exactly ONE fragment (not a sequence of
  separate fragments) that summarises the general approach to solving this question type —
  fold the question framing, the solution steps, and one worked example answer into that
  single fragment's text using "\\n" line breaks for readability (e.g. "Q: ...\\nApproach:
  1) ... 2) ...\\nExample: ..."). Use real, specific numbers/data in the worked example, not
  an abstract description. Invent a small concrete example if the source material doesn't
  give one. No citation tags inside this fragment's text either — same rule as theory, see
  CITATION below.
- commonErrors ("Common Errors"): 1-3 fragments in a casual, engaging, conversational tone
  (like a friend giving you a heads-up before the exam), each naming ONE specific mistake to
  avoid. A single error can have a short heading line followed by "\\n"-separated sub-points
  if it naturally breaks into parts. No citation tags inside this fragment's text either —
  same rule as theory, see CITATION below.

CITATION: none of theory, sampleExamples, or commonErrors ever contain a citation tag or
source name inline in their text — that clutters a fragment meant to be pasted straight onto
a physical cheat sheet. Instead, every source used anywhere across all three categories goes
into the top-level "sources" array, one entry per source (dedupe repeats). For an uploaded
file: just its name (shortened is fine, e.g. drop the extension), optionally with a
page/section, e.g. "Module 0 Introduction (p.1)". For an external source: "<short label> —
<URL>", e.g. "Wikipedia — https://en.wikipedia.org/wiki/Big_O_notation". Only include a URL
you're confident is real and correct; if unsure of the exact URL, cite the source by name
only (no invented link). Omit the array (leave it empty) only if every fragment was either
invented (a made-up worked example) or drawn from general knowledge with no single
identifiable source.

Each theory/sampleExamples/commonErrors array item is its own standalone draggable fragment,
short enough to paste onto a physical cheat sheet.

Return ONLY a JSON object, no prose before or after it, no markdown code fences, shaped
exactly like this:
{"sources": string[], "theory": string[], "sampleExamples": string[], "commonErrors": string[]}`;

  try {
    const text = await getCompletionText(prompt, 2048);
    if (text === null) {
      return Response.json(mockGeneratedContent(topicName, questionTypeName));
    }

    const parsed = extractJson<GeneratedContent>(text);
    return Response.json(sanitizeContent(parsed));
  } catch (err) {
    console.error("Content generation failed", err);
    return Response.json({ error: "Content generation failed." }, { status: 502 });
  }
}
