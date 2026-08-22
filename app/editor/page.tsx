"use client";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Download, FilePlus, ZoomIn, ZoomOut } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Modal } from "@/components/Modal";
import { Sidebar } from "@/components/editor/Sidebar";
import { SuggestionsPanel } from "@/components/editor/SuggestionsPanel";
import { PageFrame } from "@/components/editor/PageFrame";
import { Block } from "@/components/editor/Block";
import { useStudioStore } from "@/lib/store";
import { DEFAULT_CONTENT, alignToOtherBlocks, clamp, getPageDimensions, snap } from "@/lib/editor-constants";
import { escapeHtml } from "@/lib/html-safe-text";
import { exportPageToPdf } from "@/lib/export-pdf";
import type { BlockType, ExtractedFile, Topic } from "@/lib/types";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;

export default function EditorPage() {
  const router = useRouter();
  const courseCode = useStudioStore((s) => s.courseCode);
  const orientation = useStudioStore((s) => s.orientation);
  const files = useStudioStore((s) => s.files);
  const setFiles = useStudioStore((s) => s.setFiles);
  const ecpText = useStudioStore((s) => s.ecpText);
  const blocks = useStudioStore((s) => s.blocks);
  const addBlockAt = useStudioStore((s) => s.addBlockAt);
  const updateBlock = useStudioStore((s) => s.updateBlock);
  const removeBlock = useStudioStore((s) => s.removeBlock);
  const mergeAnalysisResult = useStudioStore((s) => s.mergeAnalysisResult);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showAddFiles, setShowAddFiles] = useState(false);
  const [showPublishPrompt, setShowPublishPrompt] = useState(false);
  const [publishAcknowledged, setPublishAcknowledged] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const addFilesInputRef = useRef<HTMLInputElement>(null);

  const { width: PAGE_WIDTH, height: PAGE_HEIGHT } = getPageDimensions(orientation);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  useEffect(() => {
    if (!courseCode) router.replace("/");
  }, [courseCode, router]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, delta, over } = event;
    const source = active.data.current?.source;

    if (source === "canvas") {
      const block = blocks.find((b) => b.id === active.id);
      if (!block) return;
      const rawX = clamp(snap(block.x + delta.x / zoom), 0, PAGE_WIDTH - block.width);
      const rawY = clamp(snap(block.y + delta.y / zoom), 0, PAGE_HEIGHT - block.height);
      // Snap to other blocks' edges/centers if close, otherwise keep the grid snap.
      const aligned = alignToOtherBlocks(rawX, rawY, block.width, block.height, blocks, block.id);
      const x = clamp(aligned.x, 0, PAGE_WIDTH - block.width);
      const y = clamp(aligned.y, 0, PAGE_HEIGHT - block.height);
      updateBlock(block.id, { x, y });
      return;
    }

    if (over?.id !== "page-frame") return;
    const activeRect = active.rect.current.translated;
    if (!activeRect) return;
    const x = clamp(snap((activeRect.left - over.rect.left) / zoom), 0, PAGE_WIDTH - 40);
    const y = clamp(snap((activeRect.top - over.rect.top) / zoom), 0, PAGE_HEIGHT - 40);

    if (source === "sidebar") {
      const blockType = active.data.current?.blockType as BlockType;
      addBlockAt(blockType, DEFAULT_CONTENT[blockType], x, y);
    } else if (source === "suggestion-content") {
      const content = active.data.current?.content as string;
      addBlockAt("text", escapeHtml(content), x, y);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportPageToPdf(
        "cheat-sheet-page",
        `${courseCode || "cheat-sheet"}.pdf`,
        orientation,
      );
      setPublishAcknowledged(false);
      setShowPublishPrompt(true);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleAddFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setIsAddingFiles(true);
    try {
      const formData = new FormData();
      for (const file of Array.from(fileList)) formData.append("files", file);

      const extractRes = await fetch("/api/extract-pdf", { method: "POST", body: formData });
      if (!extractRes.ok) throw new Error("Text extraction failed.");
      const extractData = (await extractRes.json()) as { files: ExtractedFile[] };
      const mergedFiles = [...files, ...extractData.files];
      setFiles(mergedFiles);

      // Re-run analysis against the full merged file set (not just the new
      // files) so topic/question counts stay consistent across the whole
      // corpus, then replace the previous analysis with this refreshed one.
      const analyseRes = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseCode, ecpText, files: mergedFiles }),
      });
      if (analyseRes.ok) {
        const analyseData = (await analyseRes.json()) as {
          topics: Topic[];
          totalQuestions: number;
        };
        mergeAnalysisResult(analyseData.topics, analyseData.totalQuestions);
      }
      setShowAddFiles(false);
    } finally {
      setIsAddingFiles(false);
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar courseCode={courseCode} active="editor" />
      <div className="flex items-center justify-between border-b border-grey-light px-8 py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Editor</span>
          <button
            type="button"
            onClick={() => setShowAddFiles(true)}
            className="flex items-center gap-1.5 text-sm text-grey hover:text-uq-purple"
          >
            <FilePlus size={16} strokeWidth={1.5} />
            Add more files
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => clamp(Number((z - ZOOM_STEP).toFixed(2)), ZOOM_MIN, ZOOM_MAX))}
              aria-label="Zoom out"
              className="text-grey hover:text-uq-purple"
            >
              <ZoomOut size={16} strokeWidth={1.5} />
            </button>
            <span className="w-10 text-center text-xs text-grey">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => clamp(Number((z + ZOOM_STEP).toFixed(2)), ZOOM_MIN, ZOOM_MAX))}
              aria-label="Zoom in"
              className="text-grey hover:text-uq-purple"
            >
              <ZoomIn size={16} strokeWidth={1.5} />
            </button>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 bg-uq-purple px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            <Download size={16} strokeWidth={1.5} />
            {isExporting ? "Exporting..." : "Export to PDF"}
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar courseCode={courseCode} />
          <div className="flex flex-1 items-start justify-center overflow-auto bg-zinc-50 py-10">
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
              <PageFrame onBackgroundClick={() => setSelectedBlockId(null)}>
                {blocks.map((block) => (
                  <Block
                    key={block.id}
                    block={block}
                    isSelected={block.id === selectedBlockId}
                    onSelect={() => setSelectedBlockId(block.id)}
                    onChange={(patch) => updateBlock(block.id, patch)}
                    onDelete={() => {
                      removeBlock(block.id);
                      setSelectedBlockId(null);
                    }}
                  />
                ))}
              </PageFrame>
            </div>
          </div>
          <SuggestionsPanel />
        </div>
      </DndContext>

      {showAddFiles && (
        <Modal title="Add more files" onClose={() => setShowAddFiles(false)}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-grey">
              Upload more lecture slides, tutorial solutions, or past exams. Analysis will
              re-run against everything uploaded so far.
            </p>
            <button
              type="button"
              onClick={() => addFilesInputRef.current?.click()}
              disabled={isAddingFiles}
              className="border border-dashed border-grey-light px-4 py-6 text-sm text-grey hover:border-uq-purple hover:text-uq-purple disabled:opacity-40"
            >
              {isAddingFiles ? "Analysing..." : "Choose PDF files"}
            </button>
            <input
              ref={addFilesInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => handleAddFiles(e.target.files)}
            />
          </div>
        </Modal>
      )}

      {showPublishPrompt && (
        <Modal title="Cheat sheet exported" onClose={() => setShowPublishPrompt(false)}>
          <div className="flex flex-col gap-3">
            {!publishAcknowledged ? (
              <>
                <p className="text-sm">
                  Your PDF downloaded successfully. Want to publish this cheat sheet for other
                  students to view?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPublishAcknowledged(true)}
                    className="bg-uq-purple px-4 py-2 text-sm font-medium text-white"
                  >
                    Yes, publish
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPublishPrompt(false)}
                    className="px-4 py-2 text-sm text-grey hover:text-foreground"
                  >
                    Not now
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-grey">
                Publishing is coming soon — this is a placeholder for a future feature. Your
                cheat sheet was not shared anywhere.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
