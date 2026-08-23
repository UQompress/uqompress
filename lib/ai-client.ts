import OpenAI from "openai";

// Gemini is instructed to return JSON only, but this strips fenced code
// blocks defensively in case it wraps the object in ```json anyway.
export function extractJson<T>(rawText: string): T {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonText = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(jsonText) as T;
  } catch {
    // Models occasionally emit stray backslashes (LaTeX-style formulas like
    // "n \log n") that aren't valid JSON escapes. Escape any backslash that
    // isn't already part of a valid JSON escape sequence, then retry once.
    const sanitized = jsonText.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
    return JSON.parse(sanitized) as T;
  }
}

// Models sometimes emit LaTeX for math (\frac{a}{b}, \sqrt{x}, \times, ...)
// even when told not to — especially when the source PDF text itself already
// contains it. This app has no math renderer, so raw LaTeX shows up as
// literal backslash-gibberish in a content block. Best-effort cleanup to
// plain text / Unicode equivalents so it reads correctly either way.
const LATEX_SYMBOLS: Record<string, string> = {
  times: "×",
  div: "÷",
  pm: "±",
  mp: "∓",
  cdot: "·",
  le: "≤",
  leq: "≤",
  ge: "≥",
  geq: "≥",
  neq: "≠",
  approx: "≈",
  infty: "∞",
  sum: "Σ",
  int: "∫",
  partial: "∂",
  nabla: "∇",
  rightarrow: "→",
  to: "→",
  leftarrow: "←",
  Rightarrow: "⇒",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  Delta: "Δ",
  epsilon: "ε",
  theta: "θ",
  lambda: "λ",
  mu: "μ",
  pi: "π",
  sigma: "σ",
  Sigma: "Σ",
  phi: "φ",
  omega: "ω",
  ldots: "…",
  cdots: "⋯",
};

export function stripLatex(text: string): string {
  let result = text;
  // \frac{a}{b} -> (a)/(b); \sqrt{x} -> √(x); \text{...} etc. just unwrap.
  // The [^{}]* groups can't span nested braces (e.g. \sqrt{...} inside a
  // \frac{...}{...}), so loop until stable — each pass resolves one more
  // level, innermost first, which then lets the next pass match the level
  // that used to contain it. Also flattens leftover x_{i} / x^{n} groups.
  let previous: string;
  do {
    previous = result;
    result = result.replace(/\\sqrt\{([^{}]*)\}/g, "√($1)");
    result = result.replace(/\\(?:text|mathrm|mathbf|mathit)\{([^{}]*)\}/g, "$1");
    result = result.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");
    result = result.replace(/\\binom\{([^{}]*)\}\{([^{}]*)\}/g, "C($1,$2)");
    result = result.replace(/([_^])\{([^{}]*)\}/g, "$1$2");
  } while (result !== previous);
  // Any remaining \word — swap for its symbol if known, else drop the backslash.
  result = result.replace(/\\([A-Za-z]+)/g, (_match, word: string) => LATEX_SYMBOLS[word] ?? word);
  // Math-mode delimiters and escaped punctuation ($x$, \{, \_, \\) have no
  // meaning outside LaTeX — drop the delimiter/backslash, keep the content.
  result = result.replace(/\$\$?/g, "");
  result = result.replace(/\\([{}%_^&#])/g, "$1");
  result = result.replace(/\\\\/g, " ");
  return result;
}

let geminiClient: OpenAI | null = null;

export const GEMINI_SERVICE_TIER = "priority" as const;
export const AI_REQUEST_MAX_ATTEMPTS = 3;

const AI_RETRY_BASE_DELAY_MS = 400;

function getReasoningEffort(model: string): "none" | "low" {
  return model.trim().toLowerCase() === "gpt-5.6-luna" ? "none" : "low";
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function getGeminiClient(): OpenAI | null {
  const baseURL = process.env.UNGATE_BASE_URL;
  const apiKey = process.env.UNGATE_API_KEY;
  if (!baseURL || !apiKey) return null;
  // Retry here rather than inside the SDK so the policy is explicit and also
  // covers an unusable response shape, not just selected HTTP status codes.
  if (!geminiClient) geminiClient = new OpenAI({ apiKey, baseURL, maxRetries: 0 });
  return geminiClient;
}

// Gemini exposes an OpenAI-compatible Chat Completions endpoint at the
// configured base URL, so the existing OpenAI SDK can be reused directly.
async function callGemini(prompt: string, maxTokens: number): Promise<string> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error(
      "AI provider is not configured — set UNGATE_BASE_URL and UNGATE_API_KEY.",
    );
  }

  const model = process.env.UNGATE_MODEL;
  if (!model) {
    throw new Error(
      "UNGATE_BASE_URL/UNGATE_API_KEY are set but UNGATE_MODEL is missing — " +
        "set UNGATE_MODEL to a Gemini model ID such as gemini-3.7-flash.",
    );
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= AI_REQUEST_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        reasoning_effort: getReasoningEffort(model),
        service_tier: GEMINI_SERVICE_TIER,
      });

      const text = response.choices[0]?.message?.content;
      if (typeof text !== "string" || text.trim().length === 0) {
        throw new Error("Unexpected response shape from Gemini.");
      }
      return text;
    } catch (error) {
      lastError = error;
      if (attempt === AI_REQUEST_MAX_ATTEMPTS) break;

      const delayMs = AI_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      console.warn(
        `AI request attempt ${attempt} failed; retrying in ${delayMs}ms.`,
        error,
      );
      await wait(delayMs);
    }
  }

  throw new Error(
    `AI request failed after ${AI_REQUEST_MAX_ATTEMPTS} attempts.`,
    { cause: lastError },
  );
}

export async function getCompletionText(prompt: string, maxTokens: number): Promise<string> {
  return callGemini(prompt, maxTokens);
}

const TRANSCRIBE_PROMPT = `Transcribe all text in this image exactly as written, verbatim,
preserving line breaks between distinct lines/points. The image may contain handwriting —
do your best to read it accurately, including any mathematical notation (write it in plain
text/Unicode, e.g. "x^2", "a/b", "≤", never LaTeX). If a word is genuinely illegible, write
"[illegible]" in its place rather than guessing. Return ONLY the transcribed text — no
commentary, no markdown formatting, no quotes around it, no "Here is the transcription:".`;

// Same Gemini endpoint as callGemini, but with an image content part alongside
// the text prompt — Gemini's OpenAI-compatible endpoint accepts the standard
// multimodal `image_url` content part for this.
export async function getImageTranscription(
  imageBase64: string,
  mediaType: string,
): Promise<string | null> {
  const client = getGeminiClient();
  if (!client) return null;

  const model = process.env.UNGATE_MODEL;
  if (!model) {
    throw new Error(
      "UNGATE_BASE_URL/UNGATE_API_KEY are set but UNGATE_MODEL is missing — " +
        "set UNGATE_MODEL to a Gemini model ID such as gemini-3.7-flash.",
    );
  }

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: TRANSCRIBE_PROMPT },
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
        ],
      },
    ],
    max_tokens: 2048,
    reasoning_effort: getReasoningEffort(model),
    service_tier: GEMINI_SERVICE_TIER,
  });

  const text = response.choices[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("Unexpected response shape from Gemini.");
  }
  return text;
}
