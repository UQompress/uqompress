export type ExtractedFile = {
  name: string;
  text: string;
};

export type Topic = {
  id: string;
  name: string;
  frequencyScore: number;
  rationale: string;
  sourceExcerpt: string;
};

export type BlockType = "text" | "table" | "image" | "divider";

export type CanvasBlock = {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
};

export type AnalysisStatus = "idle" | "loading" | "done" | "error";
