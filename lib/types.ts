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
};

export type QuestionnaireAnswer = {
  questionId: string;
  answer: string;
};

export type GeneratedContent = {
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
  | "curve"
  | "arrow"
  | "tick"
  | "circle"
  | "cross"
  | "bullet";

export type CanvasBlock = {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  textColor?: string;
  highlightColor?: string;
};

export type AnalysisStatus = "idle" | "loading" | "done" | "error";
