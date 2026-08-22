export type ExtractedFile = {
  name: string;
  text: string;
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
  | "cross";

export type CanvasBlock = {
  id: string;
  type: BlockType;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  content: string;
  fontSize?: number;
  textColor?: string;
  borderColor?: string;
  shapeColor?: string;
  strokeWidth?: number;
};

export type AnalysisStatus = "idle" | "loading" | "done" | "error";
