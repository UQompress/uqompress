import { create } from "zustand";
import type {
  AnalysisStatus,
  BlockType,
  CanvasBlock,
  ExtractedFile,
  GeneratedContent,
  Orientation,
  QuestionnaireAnswer,
  Topic,
} from "./types";

type StudioState = {
  courseCode: string;
  ecpText: string;
  files: ExtractedFile[];
  analysisStatus: AnalysisStatus;
  topics: Topic[];
  totalQuestions: number;
  orientation: Orientation;
  blocks: CanvasBlock[];
  pageCount: number;

  // AI Suggestion Bar drill-down state (topic -> question type -> content).
  selectedTopicId: string | null;
  selectedQuestionTypeId: string | null;
  questionnaireAnswers: Record<string, QuestionnaireAnswer[]>;
  generatedContent: Record<string, GeneratedContent>;

  // Left Design Bar layout grid.
  gridRows: number;
  gridCols: number;

  setCourseCode: (code: string) => void;
  startNewCourse: (code: string) => void;
  setEcpText: (text: string) => void;
  setFiles: (files: ExtractedFile[]) => void;
  setAnalysisStatus: (status: AnalysisStatus) => void;
  setAnalysisResult: (topics: Topic[], totalQuestions: number) => void;
  mergeAnalysisResult: (topics: Topic[], totalQuestions: number) => void;
  setOrientation: (orientation: Orientation) => void;
  setSelectedTopicId: (id: string | null) => void;
  setSelectedQuestionTypeId: (id: string | null) => void;
  setQuestionnaireAnswers: (questionTypeId: string, answers: QuestionnaireAnswer[]) => void;
  setGeneratedContent: (questionTypeId: string, content: GeneratedContent) => void;
  appendGeneratedContent: (questionTypeId: string, content: GeneratedContent) => void;
  setGridSize: (rows: number, cols: number) => void;
  addPage: () => void;
  addBlock: (type: BlockType, content: string) => void;
  addBlockAt: (
    type: BlockType,
    content: string,
    x: number,
    y: number,
    size?: { width: number; height: number },
    pageIndex?: number,
  ) => void;
  updateBlock: (id: string, patch: Partial<CanvasBlock>) => void;
  removeBlock: (id: string) => void;
};

let blockCounter = 0;

const DEFAULT_SIZE: Record<BlockType, { width: number; height: number }> = {
  text: { width: 220, height: 90 },
  table: { width: 260, height: 140 },
  image: { width: 200, height: 140 },
  divider: { width: 240, height: 12 },
  line: { width: 160, height: 32 },
  arrow: { width: 160, height: 32 },
  tick: { width: 32, height: 32 },
  circle: { width: 32, height: 32 },
  cross: { width: 32, height: 32 },
};
// Falls back for a `type` that isn't a current BlockType — e.g. a stale
// drag payload or dev-mode HMR module desync — instead of crashing.
const FALLBACK_SIZE = { width: 220, height: 90 };

export const useStudioStore = create<StudioState>((set) => ({
  courseCode: "",
  ecpText: "",
  files: [],
  analysisStatus: "idle",
  topics: [],
  totalQuestions: 0,
  orientation: "portrait",
  blocks: [],
  pageCount: 1,

  selectedTopicId: null,
  selectedQuestionTypeId: null,
  questionnaireAnswers: {},
  generatedContent: {},

  gridRows: 1,
  gridCols: 1,

  setCourseCode: (code) => set({ courseCode: code }),

  // Entering a course code on the landing page routes through here. If it's
  // a genuinely different course, clear every course-scoped field so the
  // previous course's materials/analysis/canvas don't linger underneath the
  // new one. Re-submitting the SAME code (case-insensitive) resumes instead.
  startNewCourse: (code) =>
    set((state) => {
      if (state.courseCode.trim().toUpperCase() === code.trim().toUpperCase()) {
        return { courseCode: code };
      }
      return {
        courseCode: code,
        ecpText: "",
        files: [],
        analysisStatus: "idle",
        topics: [],
        totalQuestions: 0,
        orientation: "portrait",
        blocks: [],
        pageCount: 1,
        selectedTopicId: null,
        selectedQuestionTypeId: null,
        questionnaireAnswers: {},
        generatedContent: {},
        gridRows: 1,
        gridCols: 1,
      };
    }),
  setEcpText: (text) => set({ ecpText: text }),
  setFiles: (files) => set({ files }),
  setAnalysisStatus: (status) => set({ analysisStatus: status }),
  setAnalysisResult: (topics, totalQuestions) => set({ topics, totalQuestions }),

  // Used by "Add more files": re-analysis always runs against the full merged
  // file set, so this replaces topics/totalQuestions wholesale rather than
  // trying to reconcile counts from two partial analyses.
  mergeAnalysisResult: (topics, totalQuestions) =>
    set({ topics, totalQuestions, selectedTopicId: null, selectedQuestionTypeId: null }),

  setOrientation: (orientation) => set({ orientation }),
  setSelectedTopicId: (id) => set({ selectedTopicId: id }),
  setSelectedQuestionTypeId: (id) => set({ selectedQuestionTypeId: id }),

  setQuestionnaireAnswers: (questionTypeId, answers) =>
    set((state) => ({
      questionnaireAnswers: { ...state.questionnaireAnswers, [questionTypeId]: answers },
    })),

  setGeneratedContent: (questionTypeId, content) =>
    set((state) => ({
      generatedContent: { ...state.generatedContent, [questionTypeId]: content },
    })),

  // Used by "View more" — adds to what's already shown instead of replacing it.
  appendGeneratedContent: (questionTypeId, content) =>
    set((state) => {
      const existing = state.generatedContent[questionTypeId];
      const merged: GeneratedContent = existing
        ? {
            sources: [...new Set([...existing.sources, ...content.sources])],
            theory: [...existing.theory, ...content.theory],
            sampleExamples: [...existing.sampleExamples, ...content.sampleExamples],
            commonErrors: [...existing.commonErrors, ...content.commonErrors],
          }
        : content;
      return { generatedContent: { ...state.generatedContent, [questionTypeId]: merged } };
    }),

  setGridSize: (rows, cols) =>
    set({ gridRows: Math.max(1, rows), gridCols: Math.max(1, cols) }),

  addPage: () => set((state) => ({ pageCount: state.pageCount + 1 })),

  // Click-to-add from the sidebar has no page context, so it always targets
  // page 0 (the first page always exists).
  addBlock: (type, content) =>
    set((state) => {
      const size = DEFAULT_SIZE[type] ?? FALLBACK_SIZE;
      blockCounter += 1;
      const block: CanvasBlock = {
        id: `block-${Date.now()}-${blockCounter}`,
        type,
        pageIndex: 0,
        x: 24 + ((blockCounter * 16) % 120),
        y: 24 + ((blockCounter * 16) % 120),
        width: size.width,
        height: size.height,
        content,
      };
      return { blocks: [...state.blocks, block] };
    }),

  addBlockAt: (type, content, x, y, size, pageIndex = 0) =>
    set((state) => {
      const resolvedSize = size ?? DEFAULT_SIZE[type] ?? FALLBACK_SIZE;
      blockCounter += 1;
      const block: CanvasBlock = {
        id: `block-${Date.now()}-${blockCounter}`,
        type,
        pageIndex,
        x,
        y,
        width: resolvedSize.width,
        height: resolvedSize.height,
        content,
      };
      return { blocks: [...state.blocks, block] };
    }),

  updateBlock: (id, patch) =>
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })),

  removeBlock: (id) =>
    set((state) => ({ blocks: state.blocks.filter((b) => b.id !== id) })),
}));
