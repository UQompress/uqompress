import type { ExtractedFile } from "./types";

export type MaterialKind = "Past paper" | "Lecture" | "Other";

const PAST_PAPER_PATTERN = /(?:^|[\s_.-])(past|paper|exam|final|mid.?sem|quiz)(?:[\s_.-]|$)/i;
const LECTURE_PATTERN = /(?:^|[\s_.-])(lecture|lect|lec|slides?|week|module)(?:[\s_.-]|$)/i;

export function attachPdfUrls(extractedFiles: ExtractedFile[], uploads: File[]): ExtractedFile[] {
  return extractedFiles.map((extractedFile, index) => {
    const upload = uploads[index];
    if (!upload) return extractedFile;
    return {
      ...extractedFile,
      pdfUrl: URL.createObjectURL(upload),
      sizeBytes: upload.size,
    };
  });
}

export function getMaterialKind(fileName: string): MaterialKind {
  if (PAST_PAPER_PATTERN.test(fileName)) return "Past paper";
  if (LECTURE_PATTERN.test(fileName)) return "Lecture";
  return "Other";
}

export function formatFileSize(sizeBytes?: number): string | null {
  if (sizeBytes === undefined) return null;
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
