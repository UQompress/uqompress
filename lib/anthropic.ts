import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export const CLAUDE_MODEL = "claude-sonnet-4-6";

// Claude is instructed to return JSON only, but strips fenced code blocks
// defensively in case it wraps the object in ```json anyway.
export function extractJson<T>(rawText: string): T {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonText = fenced ? fenced[1] : trimmed;
  return JSON.parse(jsonText) as T;
}
