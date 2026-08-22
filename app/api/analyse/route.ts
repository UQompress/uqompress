import { extractJson, getCompletionText } from "@/lib/ai-client";
import { MOCK_TOPICS, MOCK_TOTAL_QUESTIONS } from "@/lib/mock-data";
import type { ExtractedFile, Topic } from "@/lib/types";

// Cap per-file text sent to the model so a handful of large PDFs stays
// within a single request instead of building a full chunk/aggregate pipeline.
const MAX_CHARS_PER_FILE = 12000;

type AnalyseRequestBody = {
  courseCode: string;
  ecpText?: string;
  files: ExtractedFile[];
};

type RawTopic = Omit<Topic, "frequencyScore">;

function withFrequencyScores(topics: RawTopic[], totalQuestions: number): Topic[] {
  const safeTotal = totalQuestions > 0 ? totalQuestions : 1;
  return topics.map((t) => ({
    ...t,
    frequencyScore: Math.round((t.questionCount / safeTotal) * 100),
  }));
}

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

${ecpText ? `Course learning outcomes:\n${ecpText}\n\n` : ""}Course materials (past exams, tutorial solutions, and lecture slides):

${materialsBlock}

Find every individual exam/tutorial QUESTION in the materials above and classify each one
into a topic and, within that topic, a more specific question type (e.g. topic "Binary
search trees" might have question types "Insertion and drawing" and "Deletion and
rebalancing"). Count actual questions — do not estimate or invent a score.

Return ONLY a JSON object, no prose before or after it, no markdown code fences, shaped
exactly like this:
{
  "totalQuestions": number,
  "topics": [
    {
      "id": string,
      "name": string,
      "questionCount": number,
      "rationale": string,
      "sourceExcerpt": string,
      "questionTypes": [
        { "id": string, "name": string, "questionCount": number }
      ]
    }
  ]
}
Each topic's questionCount must equal the sum of its questionTypes' questionCount, and the
sum of every topic's questionCount must equal totalQuestions.`;

  try {
    const text = await getCompletionText(prompt, 4096);
    if (text === null) {
      return Response.json({ topics: MOCK_TOPICS, totalQuestions: MOCK_TOTAL_QUESTIONS });
    }

    const parsed = extractJson<{ totalQuestions: number; topics: RawTopic[] }>(text);
    return Response.json({
      totalQuestions: parsed.totalQuestions,
      topics: withFrequencyScores(parsed.topics, parsed.totalQuestions),
    });
  } catch (err) {
    console.error("Analysis failed", err);
    return Response.json({ error: "Analysis failed." }, { status: 502 });
  }
}
