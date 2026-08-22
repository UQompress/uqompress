import { extractJson, getCompletionText } from "@/lib/ai-client";
import { contentGuidePromptBlock } from "@/lib/content-guide";
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

  const prompt = `${contentGuidePromptBlock()}Draft a condensed cheat sheet entry for this exam topic.

Topic: ${topic.name}
Why it matters: ${topic.rationale}
Source excerpt: ${topic.sourceExcerpt}

Apply the guide's writing rules (§1, §4, §6). Use the card format "[Concept Name]: body"
— one concept, label is the actual name, no narrator lead-in, no filler, no second person.
Stay within the word budgets from §4. Prefer uploaded material; web lookup only when §6
permits. Run the §10 self-check before returning.

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
