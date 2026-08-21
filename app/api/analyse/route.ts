import { extractJson, getCompletionText } from "@/lib/ai-client";
import { MOCK_TOPICS } from "@/lib/mock-data";
import type { ExtractedFile, Topic } from "@/lib/types";

// Cap per-file text sent to the model so a handful of large PDFs stays
// within a single request instead of building a full chunk/aggregate pipeline.
const MAX_CHARS_PER_FILE = 12000;

type AnalyseRequestBody = {
  courseCode: string;
  ecpText?: string;
  files: ExtractedFile[];
};

export async function POST(request: Request) {
  const body = (await request.json()) as AnalyseRequestBody;
  const { courseCode, ecpText, files } = body;

  if (!files || files.length === 0) {
    return Response.json({ error: "No extracted text provided." }, { status: 400 });
  }

  const materialsBlock = files
    .map(
      (f, i) =>
        `--- Source ${i + 1}: ${f.name} ---\n${f.text.slice(0, MAX_CHARS_PER_FILE)}`,
    )
    .join("\n\n");

  const prompt = `You are analysing course materials for ${courseCode} to help a student build a cheat sheet.

${ecpText ? `Course learning outcomes:\n${ecpText}\n\n` : ""}Course materials (past exams and lecture slides):

${materialsBlock}

Identify the recurring topics being tested. For each topic, estimate how often it is
tested relative to the others (frequencyScore, 0-100, most-tested topic near 100),
explain briefly why it matters for the exam, and quote a short excerpt from the
materials above as evidence.

Return ONLY a JSON object, no prose before or after it, no markdown code fences, shaped
exactly like this:
{"topics": [{"id": string, "name": string, "frequencyScore": number, "rationale": string, "sourceExcerpt": string}]}`;

  try {
    const text = await getCompletionText(prompt, 4096);
    if (text === null) {
      return Response.json({ topics: MOCK_TOPICS });
    }

    const parsed = extractJson<{ topics: Topic[] }>(text);
    return Response.json(parsed);
  } catch (err) {
    console.error("Analysis failed", err);
    return Response.json({ error: "Analysis failed." }, { status: 502 });
  }
}
