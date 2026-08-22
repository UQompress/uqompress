// Text blocks store their content as a small safe-HTML subset (plain text
// plus <mark> spans from per-word highlighting) rather than a full rich-text
// document. Anything that sets text-block content from a plain string
// (textarea edits, AI-generated fragments) must escape it first so a user
// typing "<script>" — or an AI response containing "<div>" as literal text —
// never gets interpreted as markup when rendered via dangerouslySetInnerHTML.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
