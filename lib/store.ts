import { create } from "zustand";
import type {
  AnalysisStatus,
  BlockType,
  CanvasBlock,
  ExtractedFile,
  GeneratedContent,
  Orientation,
  QuestionnaireAnswer,
  TextBlockKind,
  Topic,
} from "./types";
import {
  DEFAULT_FONT_SIZE,
  TEXT_KIND_DEFAULTS,
  defaultTextBlockHeight,
  fitBlockToGridCell,
  getPageDimensions,
} from "./editor-constants";

const HISTORY_LIMIT = 10;

type CanvasSnapshot = {
  blocks: CanvasBlock[];
  pageCount: number;
};

type BlockExtras = Partial<
  Pick<
    CanvasBlock,
    | "textKind"
    | "fontSize"
    | "textColor"
    | "manualLabelFormat"
    | "borderColor"
    | "shapeColor"
    | "strokeWidth"
  >
>;

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
  activePageIndex: number;
  past: CanvasSnapshot[];
  future: CanvasSnapshot[];

  // AI Suggestion Bar drill-down state (topic -> question type -> content).
  selectedTopicId: string | null;
  selectedQuestionTypeId: string | null;
  questionnaireAnswers: Record<string, QuestionnaireAnswer[]>;
  generatedContent: Record<string, GeneratedContent>;

  // Left Design Bar layout grid.
  gridRows: number;
  gridCols: number;

  annotationMode: boolean;
  annotationColor: string;
  annotationStrokeWidth: number;

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
  setAnnotationMode: (on: boolean) => void;
  setAnnotationColor: (color: string) => void;
  setAnnotationStrokeWidth: (width: number) => void;
  setGridSize: (rows: number, cols: number) => void;
  setActivePageIndex: (index: number) => void;
  addPage: () => void;
  deletePage: (index: number) => void;
  addBlock: (type: BlockType, content: string, extras?: BlockExtras) => void;
  addBlockAt: (
    type: BlockType,
    content: string,
    x: number,
    y: number,
    size?: { width: number; height: number },
    pageIndex?: number,
    extras?: BlockExtras,
  ) => void;
  updateBlock: (
    id: string,
    patch: Partial<CanvasBlock>,
    opts?: { transient?: boolean; coalesceKey?: string },
  ) => void;
  removeBlock: (id: string) => void;
  captureHistory: () => void;
  undo: () => void;
  redo: () => void;
};

let blockCounter = 0;
let coalesce: { key: string; time: number } | null = null;
const COALESCE_MS = 500;

const DEFAULT_SIZE: Record<BlockType, { width: number; height: number }> = {
  text: { width: 220, height: 40 },
  table: { width: 260, height: 140 },
  image: { width: 200, height: 140 },
  divider: { width: 240, height: 12 },
  line: { width: 160, height: 32 },
  arrow: { width: 160, height: 32 },
  tick: { width: 32, height: 32 },
  circle: { width: 32, height: 32 },
  cross: { width: 32, height: 32 },
  ink: { width: 40, height: 40 },
};
// Falls back for a `type` that isn't a current BlockType — e.g. a stale
// drag payload or dev-mode HMR module desync — instead of crashing.
const FALLBACK_SIZE = { width: 220, height: 32 };

function cloneSnapshot(state: { blocks: CanvasBlock[]; pageCount: number }): CanvasSnapshot {
  return {
    blocks: structuredClone(state.blocks),
    pageCount: state.pageCount,
  };
}

function pushPast(state: StudioState, coalesceKey?: string): Pick<StudioState, "past" | "future"> {
  const now = Date.now();
  if (
    coalesceKey &&
    coalesce &&
    coalesce.key === coalesceKey &&
    now - coalesce.time < COALESCE_MS
  ) {
    coalesce.time = now;
    return { past: state.past, future: [] };
  }
  coalesce = coalesceKey ? { key: coalesceKey, time: now } : null;
  return {
    past: [...state.past, cloneSnapshot(state)].slice(-HISTORY_LIMIT),
    future: [],
  };
}

function resolveTextDefaults(type: BlockType, extras?: BlockExtras): BlockExtras {
  if (type !== "text") return extras ?? {};
  const textKind: TextBlockKind = extras?.textKind ?? "body";
  const kindDefaults = TEXT_KIND_DEFAULTS[textKind];
  return {
    textKind,
    fontSize: extras?.fontSize ?? kindDefaults.fontSize ?? DEFAULT_FONT_SIZE,
    textColor: extras?.textColor ?? kindDefaults.color,
    manualLabelFormat: extras?.manualLabelFormat ?? false,
    borderColor: extras?.borderColor,
  };
}

function resolveSize(
  type: BlockType,
  extras?: BlockExtras,
  size?: { width: number; height: number },
): { width: number; height: number } {
  if (size) return size;
  const base = DEFAULT_SIZE[type] ?? FALLBACK_SIZE;
  if (type !== "text") return base;
  const kind = extras?.textKind ?? "body";
  return { width: base.width, height: defaultTextBlockHeight(kind) };
}

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
  activePageIndex: 0,
  past: [],
  future: [],

  selectedTopicId: null,
  selectedQuestionTypeId: null,
  questionnaireAnswers: {},
  generatedContent: {},

  gridRows: 1,
  gridCols: 1,

  annotationMode: false,
  annotationColor: "#171717",
  annotationStrokeWidth: 3,

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
        activePageIndex: 0,
        past: [],
        future: [],
        selectedTopicId: null,
        selectedQuestionTypeId: null,
        questionnaireAnswers: {},
        generatedContent: {},
        gridRows: 1,
        gridCols: 1,
        annotationMode: false,
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

  setAnnotationMode: (on) => set({ annotationMode: on }),
  setAnnotationColor: (color) => set({ annotationColor: color }),
  setAnnotationStrokeWidth: (width) => set({ annotationStrokeWidth: width }),

  setGridSize: (rows, cols) =>
    set((state) => {
      const gridRows = Math.max(1, rows);
      const gridCols = Math.max(1, cols);
      const { width: pageWidth, height: pageHeight } = getPageDimensions(state.orientation);
      return {
        gridRows,
        gridCols,
        blocks: state.blocks.map((block) =>
          block.type === "ink"
            ? block
            : {
                ...block,
                ...fitBlockToGridCell({
                  type: block.type,
                  x: block.x,
                  y: block.y,
                  width: block.width,
                  height: block.height,
                  pageWidth,
                  pageHeight,
                  rows: gridRows,
                  cols: gridCols,
                }),
              },
        ),
      };
    }),

  setActivePageIndex: (index) =>
    set((state) => ({
      activePageIndex: Math.max(0, Math.min(index, state.pageCount - 1)),
    })),

  addPage: () =>
    set((state) => ({
      ...pushPast(state),
      pageCount: state.pageCount + 1,
      activePageIndex: state.pageCount,
    })),

  deletePage: (index) =>
    set((state) => {
      if (state.pageCount <= 1) return state;
      const safeIndex = Math.max(0, Math.min(index, state.pageCount - 1));
      const blocks = state.blocks
        .filter((block) => block.pageIndex !== safeIndex)
        .map((block) =>
          block.pageIndex > safeIndex ? { ...block, pageIndex: block.pageIndex - 1 } : block,
        );
      const pageCount = state.pageCount - 1;
      return {
        ...pushPast(state),
        blocks,
        pageCount,
        activePageIndex: Math.min(state.activePageIndex, pageCount - 1),
      };
    }),

  // Click-to-add from the sidebar targets the active page.
  addBlock: (type, content, extras) =>
    set((state) => {
      const resolved = resolveTextDefaults(type, extras);
      const size = resolveSize(type, extras);
      const { width: pageWidth, height: pageHeight } = getPageDimensions(state.orientation);
      blockCounter += 1;
      const placement = fitBlockToGridCell({
        type,
        x: 24 + ((blockCounter * 16) % 120),
        y: 24 + ((blockCounter * 16) % 120),
        width: size.width,
        height: size.height,
        pageWidth,
        pageHeight,
        rows: state.gridRows,
        cols: state.gridCols,
      });
      const block: CanvasBlock = {
        id: `block-${Date.now()}-${blockCounter}`,
        type,
        pageIndex: state.activePageIndex,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: size.height,
        content,
        ...resolved,
      };
      return { ...pushPast(state), blocks: [...state.blocks, block] };
    }),

  addBlockAt: (type, content, x, y, size, pageIndex, extras) =>
    set((state) => {
      const resolved = resolveTextDefaults(type, extras);
      const resolvedSize = resolveSize(type, extras, size);
      const { width: pageWidth, height: pageHeight } = getPageDimensions(state.orientation);
      const placement = fitBlockToGridCell({
        type,
        x,
        y,
        width: resolvedSize.width,
        height: resolvedSize.height,
        pageWidth,
        pageHeight,
        rows: state.gridRows,
        cols: state.gridCols,
      });
      blockCounter += 1;
      const block: CanvasBlock = {
        id: `block-${Date.now()}-${blockCounter}`,
        type,
        pageIndex: pageIndex ?? state.activePageIndex,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: resolvedSize.height,
        content,
        ...resolved,
      };
      return { ...pushPast(state), blocks: [...state.blocks, block] };
    }),

  updateBlock: (id, patch, opts) =>
    set((state) => {
      const blocks = state.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b));
      if (opts?.transient) return { blocks };
      return {
        ...pushPast(state, opts?.coalesceKey),
        blocks,
      };
    }),

  removeBlock: (id) =>
    set((state) => ({
      ...pushPast(state),
      blocks: state.blocks.filter((b) => b.id !== id),
    })),

  captureHistory: () =>
    set((state) => ({
      ...pushPast(state),
    })),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      coalesce = null;
      return {
        blocks: previous.blocks,
        pageCount: previous.pageCount,
        activePageIndex: Math.min(state.activePageIndex, Math.max(0, previous.pageCount - 1)),
        past: state.past.slice(0, -1),
        future: [...state.future, cloneSnapshot(state)].slice(-HISTORY_LIMIT),
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[state.future.length - 1];
      coalesce = null;
      return {
        blocks: next.blocks,
        pageCount: next.pageCount,
        activePageIndex: Math.min(state.activePageIndex, Math.max(0, next.pageCount - 1)),
        future: state.future.slice(0, -1),
        past: [...state.past, cloneSnapshot(state)].slice(-HISTORY_LIMIT),
      };
    }),
}));
