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
import { ZoomIn, ZoomOut } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Modal } from "@/components/Modal";
import { Sidebar } from "@/components/editor/Sidebar";
import { SuggestionsPanel } from "@/components/editor/SuggestionsPanel";
import { PageFrame } from "@/components/editor/PageFrame";
import { Block } from "@/components/editor/Block";
import { FormattingToolbar } from "@/components/editor/FormattingToolbar";
import { ExportPanel } from "@/components/editor/ExportPanel";
import { ViewSampleModal } from "@/components/editor/ViewSampleModal";
import { useStudioStore } from "@/lib/store";
import {
  DEFAULT_CONTENT,
  alignToOtherBlocks,
  clamp,
  estimateTextBlockSize,
  fitBlockToGridCell,
  getGridCellIndexes,
  getPageDimensions,
  snap,
} from "@/lib/editor-constants";
import { plainTextToBlockHtml } from "@/lib/rich-text";
import { exportPagesToPdf } from "@/lib/export-pdf";
import type { BlockType, ExtractedFile, TextBlockKind, Topic } from "@/lib/types";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;
const ZOOM_WHEEL_STEP = 0.2;

export default function EditorPage() {
  const router = useRouter();
  const courseCode = useStudioStore((s) => s.courseCode);
  const orientation = useStudioStore((s) => s.orientation);
  const files = useStudioStore((s) => s.files);
  const setFiles = useStudioStore((s) => s.setFiles);
  const ecpText = useStudioStore((s) => s.ecpText);
  const blocks = useStudioStore((s) => s.blocks);
  const pageCount = useStudioStore((s) => s.pageCount);
  const gridRows = useStudioStore((s) => s.gridRows);
  const gridCols = useStudioStore((s) => s.gridCols);
  const addBlockAt = useStudioStore((s) => s.addBlockAt);
  const updateBlock = useStudioStore((s) => s.updateBlock);
  const removeBlock = useStudioStore((s) => s.removeBlock);
  const mergeAnalysisResult = useStudioStore((s) => s.mergeAnalysisResult);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<"edit" | "compare">("edit");
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [showAddFiles, setShowAddFiles] = useState(false);
  const [showPublishPrompt, setShowPublishPrompt] = useState(false);
  const [publishAcknowledged, setPublishAcknowledged] = useState(false);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const addFilesInputRef = useRef<HTMLInputElement>(null);
  const sheetViewportRef = useRef<HTMLDivElement>(null);
  const panStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  const { width: PAGE_WIDTH, height: PAGE_HEIGHT } = getPageDimensions(orientation);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  useEffect(() => {
    if (!courseCode) router.replace("/");
  }, [courseCode, router]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === "z") {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (!selectedBlockId) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const active = document.activeElement as HTMLElement | null;
      // Don't hijack Backspace/Delete while the user is typing inside a
      // block's own editable content.
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
        return;
      }
      removeBlock(selectedBlockId);
      setSelectedBlockId(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedBlockId, removeBlock, undo, redo]);

  useEffect(() => {
    const viewport = sheetViewportRef.current;
    if (!viewport) return;

    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const direction = e.deltaY < 0 ? 1 : -1;
      setZoom((current) =>
        clamp(
          Number((current + direction * ZOOM_WHEEL_STEP).toFixed(2)),
          ZOOM_MIN,
          ZOOM_MAX,
        ),
      );
    }

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, []);

  function startViewportPan(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 1) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    panStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: e.currentTarget.scrollLeft,
      scrollTop: e.currentTarget.scrollTop,
    };
    setIsPanning(true);
  }

  function moveViewportPan(e: React.PointerEvent<HTMLDivElement>) {
    const pan = panStateRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;
    e.preventDefault();
    e.currentTarget.scrollLeft = pan.scrollLeft - (e.clientX - pan.startX);
    e.currentTarget.scrollTop = pan.scrollTop - (e.clientY - pan.startY);
  }

  function stopViewportPan(e: React.PointerEvent<HTMLDivElement>) {
    const pan = panStateRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;
    panStateRef.current = null;
    setIsPanning(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, delta, over } = event;
    const source = active.data.current?.source;

    if (source === "canvas") {
      const block = blocks.find((b) => b.id === active.id);
      if (!block) return;
      const rawX = clamp(snap(block.x + delta.x / zoom), 0, PAGE_WIDTH - block.width);
      const rawY = clamp(snap(block.y + delta.y / zoom), 0, PAGE_HEIGHT - block.height);
      // Snap to other blocks' edges/centers on the SAME page only — moving a
      // block between pages isn't supported yet, so it never leaves its
      // current pageIndex, and shouldn't align against a different page's
      // blocks either (they're nowhere near it on screen).
      const targetCell = getGridCellIndexes(
        rawX,
        rawY,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        gridRows,
        gridCols,
      );
      const blocksInSameCell = blocks.filter((other) => {
        if (other.pageIndex !== block.pageIndex) return false;
        const otherCell = getGridCellIndexes(
          other.x,
          other.y,
          PAGE_WIDTH,
          PAGE_HEIGHT,
          gridRows,
          gridCols,
        );
        return otherCell.row === targetCell.row && otherCell.col === targetCell.col;
      });
      const aligned = alignToOtherBlocks(
        rawX,
        rawY,
        block.width,
        block.height,
        blocksInSameCell,
        block.id,
      );
      const placement = fitBlockToGridCell({
        type: block.type,
        x: aligned.x,
        y: aligned.y,
        width: block.width,
        height: block.height,
        pageWidth: PAGE_WIDTH,
        pageHeight: PAGE_HEIGHT,
        rows: gridRows,
        cols: gridCols,
      });
      updateBlock(block.id, placement);
      return;
    }

    if (!over || typeof over.id !== "string") return;
    const overMatch = /^page-frame-(\d+)$/.exec(over.id);
    if (!overMatch) return;
    const targetPageIndex = Number(overMatch[1]);
    const activeRect = active.rect.current.translated;
    if (!activeRect) return;
    const x = clamp(snap((activeRect.left - over.rect.left) / zoom), 0, PAGE_WIDTH - 40);
    const y = clamp(snap((activeRect.top - over.rect.top) / zoom), 0, PAGE_HEIGHT - 40);

    if (source === "sidebar") {
      const blockType = active.data.current?.blockType as BlockType;
      const textKind = active.data.current?.textKind as TextBlockKind | undefined;
      addBlockAt(
        blockType,
        DEFAULT_CONTENT[blockType],
        x,
        y,
        undefined,
        targetPageIndex,
        textKind ? { textKind } : undefined,
      );
    } else if (source === "suggestion-content") {
      const content = active.data.current?.content as string;
      addBlockAt(
        "text",
        plainTextToBlockHtml(content, "body"),
        x,
        y,
        estimateTextBlockSize(content),
        targetPageIndex,
        { textKind: "body" },
      );
    }
  }

  async function handleExport(pageIndexes: number[]) {
    setIsExporting(true);
    try {
      setSelectedBlockId(null);
      await exportPagesToPdf(
        pageIndexes,
        `${courseCode || "cheat-sheet"}.pdf`,
        orientation,
      );
      setShowExportPanel(false);
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
      try {
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
      } catch {
        // TEMP: bypass analysis failure — keep existing topics and continue.
      }
      setShowAddFiles(false);
    } finally {
      setIsAddingFiles(false);
    }
  }

  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) ?? null;

  return (
    <div className="flex h-screen flex-col">
      <TopBar
        courseCode={courseCode}
        active="editor"
        wordmark="CheatSheet Studio"
        onSamplesClick={() => setShowSample(true)}
        onExportClick={() => setShowExportPanel(true)}
        isExporting={isExporting}
      />
      <FormattingToolbar disabled={sidebarMode === "compare"} selectedBlock={selectedBlock} />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            mode={sidebarMode}
            onModeChange={setSidebarMode}
            onAddFiles={() => setShowAddFiles(true)}
          />
          {sidebarMode === "compare" ? (
            <div className="flex flex-1 flex-col items-center overflow-auto bg-zinc-50 py-10">
              <PageFrame index={0} blank onBackgroundClick={() => undefined}>
                {null}
              </PageFrame>
            </div>
          ) : (
            <div
              ref={sheetViewportRef}
              onPointerDown={startViewportPan}
              onPointerMove={moveViewportPan}
              onPointerUp={stopViewportPan}
              onPointerCancel={stopViewportPan}
              onAuxClick={(e) => {
                if (e.button === 1) e.preventDefault();
              }}
              className={`relative flex flex-1 flex-col items-center gap-8 overflow-auto bg-zinc-50 py-10 ${
                isPanning ? "cursor-grabbing select-none" : ""
              }`}
            >
              {Array.from({ length: pageCount }, (_, pageIndex) => (
                <div
                  key={pageIndex}
                  style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                >
                  <PageFrame index={pageIndex} onBackgroundClick={() => setSelectedBlockId(null)}>
                    {blocks
                      .filter((block) => block.pageIndex === pageIndex)
                      .map((block) => (
                        <Block
                          key={block.id}
                          block={block}
                          isSelected={block.id === selectedBlockId}
                          onSelect={() => setSelectedBlockId(block.id)}
                          onChange={(patch, opts) => updateBlock(block.id, patch, opts)}
                          onDelete={() => {
                            removeBlock(block.id);
                            setSelectedBlockId(null);
                          }}
                          zoom={zoom}
                        />
                      ))}
                  </PageFrame>
                </div>
              ))}
              <div className="sticky bottom-4 flex items-center gap-1 rounded-sm border border-grey-light bg-white px-2 py-1">
                <button
                  type="button"
                  onClick={() =>
                    setZoom((z) => clamp(Number((z - ZOOM_STEP).toFixed(2)), ZOOM_MIN, ZOOM_MAX))
                  }
                  aria-label="Zoom out"
                  className="text-grey hover:text-uq-purple"
                >
                  <ZoomOut size={16} strokeWidth={1.5} />
                </button>
                <span className="w-10 text-center text-xs tabular-nums text-grey">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setZoom((z) => clamp(Number((z + ZOOM_STEP).toFixed(2)), ZOOM_MIN, ZOOM_MAX))
                  }
                  aria-label="Zoom in"
                  className="text-grey hover:text-uq-purple"
                >
                  <ZoomIn size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}
          {/* Keep real pages mounted while Compare is showing so PDF export
              can still find #cheat-sheet-page-N. */}
          {sidebarMode === "compare" && (
            <div className="pointer-events-none absolute -left-[10000px] top-0" aria-hidden>
              {Array.from({ length: pageCount }, (_, pageIndex) => (
                <PageFrame key={pageIndex} index={pageIndex} onBackgroundClick={() => undefined}>
                  {blocks
                    .filter((block) => block.pageIndex === pageIndex)
                    .map((block) => (
                      <Block
                        key={block.id}
                        block={block}
                        isSelected={false}
                        onSelect={() => undefined}
                        onChange={() => undefined}
                        onDelete={() => undefined}
                      />
                    ))}
                </PageFrame>
              ))}
            </div>
          )}
          <SuggestionsPanel />
        </div>
      </DndContext>

      {showSample && (
        <ViewSampleModal courseCode={courseCode} onClose={() => setShowSample(false)} />
      )}

      {showExportPanel && (
        <ExportPanel
          onClose={() => setShowExportPanel(false)}
          onExport={handleExport}
          isExporting={isExporting}
        />
      )}

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
