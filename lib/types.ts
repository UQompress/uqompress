export type ExtractedFile = {
  name: string;
  text: string;
  // Browser-local URL for reopening the original upload. It exists only for
  // the current session and is never sent as the PDF contents to the server.
  pdfUrl?: string;
  sizeBytes?: number;
};

export type Orientation = "portrait" | "landscape";

export type QuestionType = {
  id: string;
  name: string;
  questionCount: number;
};

export type Topic = {
  id: string;
  name: string;
  questionCount: number;
  // 0-100, derived from questionCount / totalQuestions — computed server-side,
  // not asked of the model directly, so the ranking stays numerically consistent.
  frequencyScore: number;
  rationale: string;
  sourceExcerpt: string;
  questionTypes: QuestionType[];
};

export type QuestionnaireQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

export type QuestionnaireAnswer = {
  questionId: string;
  answer: string;
};

export type GeneratedContent = {
  // Sources backing theory/sampleExamples/commonErrors below — a file name
  // (uploaded material) or a link + short label (trusted external source).
  // Shown via the "Sources" popup, never inlined into a fragment's text.
  sources: string[];
  theory: string[];
  sampleExamples: string[];
  commonErrors: string[];
};

export type BlockType =
  | "text"
  | "table"
  | "image"
  | "divider"
  | "line"
  | "arrow"
  | "tick"
  | "circle"
  | "cross"
  | "ink";

export type TextBlockKind = "topic" | "subtopic" | "body" | "subbody";

export type CanvasBlock = {
  id: string;
  type: BlockType;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  // Text blocks store a sanitised HTML subset (b/i/u/span/br). Ink blocks
  // store serialised path data. Other types keep plain text (table rows,
  // image data URLs, empty shapes).
  content: string;
  fontSize?: number;
  textColor?: string;
  borderColor?: string;
  shapeColor?: string;
  strokeWidth?: number;
  textKind?: TextBlockKind;
  // When true, the label-before-colon auto-bold is skipped for this block.
  manualLabelFormat?: boolean;
};

export type AnalysisStatus = "idle" | "loading" | "done" | "error";
