import { readFileSync } from "fs";
import { join } from "path";

let cachedGuide: string | null = null;

export function getContentGuide(): string {
  if (cachedGuide === null) {
    cachedGuide = readFileSync(join(process.cwd(), "MD", "content-guide.md"), "utf-8");
  }
  return cachedGuide;
}

/** Prepended to every cheat-sheet content generation prompt. */
export function contentGuidePromptBlock(): string {
  return `CONTENT GENERATION GUIDE — follow every rule below when drafting cheat sheet content:

${getContentGuide()}

---
`;
}
