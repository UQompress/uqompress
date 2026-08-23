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

function getGeminiClient(): OpenAI | null {
  const baseURL = process.env.UNGATE_BASE_URL;
  const apiKey = process.env.UNGATE_API_KEY;
  if (!baseURL || !apiKey) return null;
  if (!geminiClient) geminiClient = new OpenAI({ apiKey, baseURL });
  return geminiClient;
}

// Gemini exposes an OpenAI-compatible Chat Completions endpoint at the
// configured base URL, so the existing OpenAI SDK can be reused directly.
async function callGemini(prompt: string, maxTokens: number): Promise<string | null> {
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
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    reasoning_effort: "low",
    service_tier: GEMINI_SERVICE_TIER,
  });

  const text = response.choices[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("Unexpected response shape from Gemini.");
  }
  return text;
}

// Signals the caller to fall back to mock data when Gemini is not configured.
export async function getCompletionText(prompt: string, maxTokens: number): Promise<string | null> {
  return callGemini(prompt, maxTokens);
}
