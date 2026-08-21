import { CLAUDE_MODEL, getAnthropicClient } from "./anthropic";

// Claude (or the custom endpoint below) is instructed to return JSON only,
// but this strips fenced code blocks defensively in case it wraps the
// object in ```json anyway.
export function extractJson<T>(rawText: string): T {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonText = fenced ? fenced[1] : trimmed;
  return JSON.parse(jsonText) as T;
}

// OpenAI-chat-completions-compatible endpoint, configured via env vars so it
// can point at any provider using that wire format (not just OpenAI itself).
async function callCustomProvider(prompt: string, maxTokens: number): Promise<string | null> {
  const baseUrl = process.env.AI_API_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!baseUrl || !apiKey || !model) return null;

  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    throw new Error(`Custom AI provider request failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("Unexpected response shape from custom AI provider.");
  }
  return text;
}

async function callAnthropic(prompt: string, maxTokens: number): Promise<string | null> {
  const client = getAnthropicClient();
  if (!client) return null;

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Anthropic.");
  }
  return textBlock.text;
}

// Tries the custom provider first (if configured), then Anthropic, then
// signals the caller to fall back to mock data.
export async function getCompletionText(prompt: string, maxTokens: number): Promise<string | null> {
  const fromCustomProvider = await callCustomProvider(prompt, maxTokens);
  if (fromCustomProvider !== null) return fromCustomProvider;

  return callAnthropic(prompt, maxTokens);
}
