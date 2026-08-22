export type SampleCheatsheet = {
  courseCode: string;
  title: string;
  notes: string[];
};

// Placeholder sample data — no real student-submitted cheat sheets exist yet.
// Replace INFS1200's entry with the real supplied file(s) when available.
const SAMPLE_CHEATSHEETS: Record<string, SampleCheatsheet> = {
  INFS1200: {
    courseCode: "INFS1200",
    title: "INFS1200 — sample cheat sheet (placeholder)",
    notes: [
      "This is placeholder sample content, not a real student submission — swap in the real INFS1200 cheat sheet file(s) once supplied.",
      "Typical layout seen in past student sheets: ER-diagram notation top-left, SQL syntax reference top-right, normalisation steps (1NF/2NF/3NF) bottom-left, common exam pitfalls bottom-right.",
    ],
  },
};

export function getSampleCheatsheet(courseCode: string): SampleCheatsheet | null {
  return SAMPLE_CHEATSHEETS[courseCode.trim().toUpperCase()] ?? null;
}
