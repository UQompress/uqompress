import { create } from "zustand";
import type {
  AnalysisStatus,
  BlockType,
  CanvasBlock,
  ExtractedFile,
  Topic,
} from "./types";

type StudioState = {
  courseCode: string;
  ecpText: string;
  files: ExtractedFile[];
  analysisStatus: AnalysisStatus;
  topics: Topic[];
  selectedTopicId: string | null;
  blocks: CanvasBlock[];

  setCourseCode: (code: string) => void;
  setEcpText: (text: string) => void;
  setFiles: (files: ExtractedFile[]) => void;
  setAnalysisStatus: (status: AnalysisStatus) => void;
  setTopics: (topics: Topic[]) => void;
  setSelectedTopicId: (id: string | null) => void;
  addBlock: (type: BlockType, content: string) => void;
  addBlockAt: (type: BlockType, content: string, x: number, y: number) => void;
  updateBlock: (id: string, patch: Partial<CanvasBlock>) => void;
  removeBlock: (id: string) => void;
};

let blockCounter = 0;

const DEFAULT_SIZE: Record<BlockType, { width: number; height: number }> = {
  text: { width: 220, height: 90 },
  table: { width: 260, height: 140 },
  image: { width: 200, height: 140 },
  divider: { width: 240, height: 12 },
};

export const useStudioStore = create<StudioState>((set) => ({
  courseCode: "",
  ecpText: "",
  files: [],
  analysisStatus: "idle",
  topics: [],
  selectedTopicId: null,
  blocks: [],

  setCourseCode: (code) => set({ courseCode: code }),
  setEcpText: (text) => set({ ecpText: text }),
  setFiles: (files) => set({ files }),
  setAnalysisStatus: (status) => set({ analysisStatus: status }),
  setTopics: (topics) => set({ topics }),
  setSelectedTopicId: (id) => set({ selectedTopicId: id }),

  addBlock: (type, content) =>
    set((state) => {
      const size = DEFAULT_SIZE[type];
      blockCounter += 1;
      const block: CanvasBlock = {
        id: `block-${Date.now()}-${blockCounter}`,
        type,
        x: 24 + ((blockCounter * 16) % 120),
        y: 24 + ((blockCounter * 16) % 120),
        width: size.width,
        height: size.height,
        content,
      };
      return { blocks: [...state.blocks, block] };
    }),

  addBlockAt: (type, content, x, y) =>
    set((state) => {
      const size = DEFAULT_SIZE[type];
      blockCounter += 1;
      const block: CanvasBlock = {
        id: `block-${Date.now()}-${blockCounter}`,
        type,
        x,
        y,
        width: size.width,
        height: size.height,
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
