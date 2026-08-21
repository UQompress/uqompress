import { extractJson, getCompletionText } from "@/lib/ai-client";
import type { Topic } from "@/lib/types";

type InsertContentBody = {
  topic: Pick<Topic, "name" | "rationale" | "sourceExcerpt">;
};

function mockContent(topic: InsertContentBody["topic"]): string {
  return `${topic.name}: ${topic.rationale}`.slice(0, 220);
}

export async function POST(request: Request) {
  const { topic } = (await request.json()) as InsertContentBody;

  if (!topic?.name) {
    return Response.json({ error: "Missing topic." }, { status: 400 });
  }

  const prompt = `Draft a condensed cheat sheet entry for this exam topic.

Topic: ${topic.name}
Why it matters: ${topic.rationale}
Source excerpt: ${topic.sourceExcerpt}

Write under 60 words, dense and exam-ready, no filler phrasing, suitable to paste
directly onto a physical cheat sheet.

Return ONLY a JSON object, no prose before or after it, no markdown code fences, shaped
exactly like this: {"content": string}`;

  try {
    const text = await getCompletionText(prompt, 512);
    if (text === null) {
      return Response.json({ content: mockContent(topic) });
    }

    const parsed = extractJson<{ content: string }>(text);
    return Response.json(parsed);
  } catch (err) {
    console.error("Content drafting failed", err);
    return Response.json({ error: "Content drafting failed." }, { status: 502 });
  }
}
