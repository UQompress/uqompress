import OpenAI from "openai";
import { CLAUDE_MODEL, getAnthropicClient } from "./anthropic";

// Claude (or Ungate below) is instructed to return JSON only, but this
// strips fenced code blocks defensively in case it wraps the object in
// ```json anyway.
export function extractJson<T>(rawText: string): T {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonText = fenced ? fenced[1] : trimmed;
  return JSON.parse(jsonText) as T;
}

let ungateClient: OpenAI | null = null;

export const UNGATE_SERVICE_TIER = "priority" as const;

function getUngateClient(): OpenAI | null {
  const baseURL = process.env.UNGATE_BASE_URL;
  const apiKey = process.env.UNGATE_API_KEY;
  if (!baseURL || !apiKey) return null;
  if (!ungateClient) ungateClient = new OpenAI({ apiKey, baseURL });
  return ungateClient;
}

// Ungate (a local gateway proxying your own ChatGPT/Claude/MiniMax provider
// accounts) only registers /v1/chat/completions externally, not /v1/responses
// — use client.chat.completions.create(), not client.responses.create().
async function callUngate(prompt: string, maxTokens: number): Promise<string | null> {
  const client = getUngateClient();
  if (!client) return null;

  const model = process.env.UNGATE_MODEL;
  if (!model) {
    throw new Error(
      "UNGATE_BASE_URL/UNGATE_API_KEY are set but UNGATE_MODEL is missing — " +
        "call GET /v1/models against your Ungate instance and set UNGATE_MODEL to one of the returned IDs.",
    );
  }

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    reasoning_effort: "low",
    // `priority` is the backward-compatible request value for Fast mode.
    service_tier: UNGATE_SERVICE_TIER,
  });

  const text = response.choices[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("Unexpected response shape from Ungate.");
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

// Tries Ungate first (if configured), then Anthropic, then signals the
// caller to fall back to mock data.
export async function getCompletionText(prompt: string, maxTokens: number): Promise<string | null> {
  const fromUngate = await callUngate(prompt, maxTokens);
  if (fromUngate !== null) return fromUngate;

  return callAnthropic(prompt, maxTokens);
}
