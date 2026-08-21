"use client";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/editor/Sidebar";
import { SuggestionsPanel } from "@/components/editor/SuggestionsPanel";
import { PageFrame } from "@/components/editor/PageFrame";
import { Block } from "@/components/editor/Block";
import { useStudioStore } from "@/lib/store";
import { clamp, PAGE_HEIGHT, PAGE_WIDTH, snap } from "@/lib/editor-constants";
import { exportPageToPdf } from "@/lib/export-pdf";
import type { BlockType, Topic } from "@/lib/types";

const DEFAULT_CONTENT: Record<BlockType, string> = {
  text: "",
  table: "Header 1 | Header 2\nRow 1 | Row 2",
  image: "",
  divider: "",
};

export default function EditorPage() {
  const router = useRouter();
  const courseCode = useStudioStore((s) => s.courseCode);
  const topics = useStudioStore((s) => s.topics);
  const blocks = useStudioStore((s) => s.blocks);
  const addBlockAt = useStudioStore((s) => s.addBlockAt);
  const updateBlock = useStudioStore((s) => s.updateBlock);
  const removeBlock = useStudioStore((s) => s.removeBlock);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  useEffect(() => {
    if (!courseCode) router.replace("/");
  }, [courseCode, router]);

  async function insertSuggestion(topic: Topic, x: number, y: number) {
    try {
      const res = await fetch("/api/insert-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = (await res.json()) as { content?: string };
      addBlockAt("text", data.content ?? topic.name, x, y);
    } catch {
      addBlockAt("text", topic.name, x, y);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, delta, over } = event;
    const source = active.data.current?.source;

    if (source === "canvas") {
      const block = blocks.find((b) => b.id === active.id);
      if (!block) return;
      const x = clamp(snap(block.x + delta.x), 0, PAGE_WIDTH - block.width);
      const y = clamp(snap(block.y + delta.y), 0, PAGE_HEIGHT - block.height);
      updateBlock(block.id, { x, y });
      return;
    }

    if (over?.id !== "page-frame") return;
    const activeRect = active.rect.current.translated;
    if (!activeRect) return;
    const x = clamp(snap(activeRect.left - over.rect.left), 0, PAGE_WIDTH - 40);
    const y = clamp(snap(activeRect.top - over.rect.top), 0, PAGE_HEIGHT - 40);

    if (source === "sidebar") {
      const blockType = active.data.current?.blockType as BlockType;
      addBlockAt(blockType, DEFAULT_CONTENT[blockType], x, y);
    } else if (source === "suggestion") {
      const topic = active.data.current?.topic as Topic;
      void insertSuggestion(topic, x, y);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportPageToPdf("cheat-sheet-page", `${courseCode || "cheat-sheet"}.pdf`);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar courseCode={courseCode} active="editor" />
      <div className="flex items-center justify-between border-b border-grey-light px-8 py-3">
        <span className="text-sm font-medium">Editor</span>
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

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 items-start justify-center overflow-auto bg-zinc-50 py-10">
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
          <SuggestionsPanel topics={topics} />
        </div>
      </DndContext>
    </div>
  );
}
