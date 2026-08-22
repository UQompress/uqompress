"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  Check,
  ChevronDown,
  Circle,
  FilePlus,
  Image as ImageIcon,
  Minus,
  MoveRight,
  PenLine,
  Table,
  Trash2,
  X,
} from "lucide-react";
import type { BlockType, TextBlockKind } from "@/lib/types";
import { useStudioStore } from "@/lib/store";
import { DEFAULT_CONTENT, TEXT_KIND_DEFAULTS, TEXT_KIND_LABELS } from "@/lib/editor-constants";
import { Modal } from "@/components/Modal";
import { PageThumbnail } from "./PageThumbnail";

const BLOCK_OPTIONS: { type: Exclude<BlockType, "text">; label: string; icon: typeof Table }[] = [
  { type: "table", label: "Table", icon: Table },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "divider", label: "Divider", icon: Minus },
];

const DESIGN_ELEMENT_OPTIONS: { type: BlockType; label: string; icon: typeof Table }[] = [
  { type: "line", label: "Straight line", icon: PenLine },
  { type: "arrow", label: "Arrow", icon: MoveRight },
  { type: "tick", label: "Tick", icon: Check },
  { type: "circle", label: "Circle", icon: Circle },
  { type: "cross", label: "Cross", icon: X },
];

const TEXT_KINDS: TextBlockKind[] = ["topic", "subtopic", "body", "subbody"];

function SidebarItem({
  type,
  label,
  icon: Icon,
}: {
  type: BlockType;
  label: string;
  icon: typeof Table;
}) {
  const addBlock = useStudioStore((s) => s.addBlock);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-${type}`,
    data: { source: "sidebar", blockType: type },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      onClick={() => addBlock(type, DEFAULT_CONTENT[type])}
      title="Click to add, or drag onto the canvas"
      className={`flex w-full items-center gap-2 border border-grey-light px-3 py-2 text-sm hover:border-uq-purple hover:text-uq-purple ${isDragging ? "opacity-40" : ""}`}
    >
      <Icon size={16} strokeWidth={1.5} />
      {label}
    </button>
  );
}

function TextKindItem({ kind }: { kind: TextBlockKind }) {
  const addBlock = useStudioStore((s) => s.addBlock);
  const defaults = TEXT_KIND_DEFAULTS[kind];
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-text-${kind}`,
    data: { source: "sidebar", blockType: "text", textKind: kind },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      onClick={() => addBlock("text", "", { textKind: kind })}
      title="Click to add, or drag onto the canvas"
      className={`w-full border border-grey-light px-2 py-1.5 text-left hover:border-uq-purple ${isDragging ? "opacity-40" : ""}`}
    >
      <span
        className="block w-full"
        style={{
          fontSize: `${Math.max(defaults.fontSize, 8)}px`,
          fontWeight: defaults.fontWeight,
          lineHeight: 1.15,
          color: defaults.color,
          background: defaults.background,
          textTransform: defaults.textTransform,
          padding: defaults.padding,
          paddingLeft: defaults.indent ? `${4 + defaults.indent}px` : undefined,
        }}
      >
        {TEXT_KIND_LABELS[kind]}
      </span>
    </button>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mb-2 flex w-full items-center justify-between text-xs uppercase tracking-wide text-grey"
      >
        {title}
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className={`transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
        />
      </button>
      {open ? children : null}
    </div>
  );
}

export function Sidebar({
  mode,
  onModeChange,
  onAddFiles,
}: {
  mode: "edit" | "compare";
  onModeChange: (mode: "edit" | "compare") => void;
  onAddFiles: () => void;
}) {
  const gridRows = useStudioStore((s) => s.gridRows);
  const gridCols = useStudioStore((s) => s.gridCols);
  const setGridSize = useStudioStore((s) => s.setGridSize);
  const pageCount = useStudioStore((s) => s.pageCount);
  const addPage = useStudioStore((s) => s.addPage);
  const deletePage = useStudioStore((s) => s.deletePage);
  const blocks = useStudioStore((s) => s.blocks);
  const activePageIndex = useStudioStore((s) => s.activePageIndex);
  const setActivePageIndex = useStudioStore((s) => s.setActivePageIndex);
  const [textOpen, setTextOpen] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  function handleDeletePage() {
    if (pageCount <= 1) return;
    const hasBlocks = blocks.some((block) => block.pageIndex === activePageIndex);
    if (hasBlocks) {
      setPendingDelete(activePageIndex);
      return;
    }
    deletePage(activePageIndex);
  }

  function confirmDelete() {
    if (pendingDelete === null) return;
    deletePage(pendingDelete);
    setPendingDelete(null);
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-grey-light">
      <div className="flex border-b border-grey-light">
        <button
          type="button"
          onClick={() => onModeChange("edit")}
          className={`flex-1 px-3 py-2 text-sm ${
            mode === "edit" ? "bg-uq-purple font-medium text-white" : "text-grey hover:text-foreground"
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onModeChange("compare")}
          className={`flex-1 px-3 py-2 text-sm ${
            mode === "compare" ? "bg-uq-purple font-medium text-white" : "text-grey hover:text-foreground"
          }`}
        >
          Compare
        </button>
      </div>

      {mode === "edit" && (
        <div className="flex flex-col gap-6 px-4 py-5">
          <div>
            <h2 className="mb-2 text-xs uppercase tracking-wide text-grey">Pages</h2>
            <div className="mb-2 flex flex-wrap gap-2">
              {Array.from({ length: pageCount }, (_, index) => (
                <PageThumbnail
                  key={index}
                  pageIndex={index}
                  width={64}
                  selected={index === activePageIndex}
                  onClick={() => {
                    setActivePageIndex(index);
                    document
                      .getElementById(`cheat-sheet-page-${index}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addPage()}
                className="flex flex-1 items-center justify-center gap-1 border border-grey-light px-2 py-1.5 text-xs hover:border-uq-purple hover:text-uq-purple"
              >
                <FilePlus size={12} strokeWidth={1.5} />
                Add page
              </button>
              <button
                type="button"
                onClick={handleDeletePage}
                disabled={pageCount <= 1}
                className="flex flex-1 items-center justify-center gap-1 border border-grey-light px-2 py-1.5 text-xs hover:border-uq-purple hover:text-uq-purple disabled:opacity-40"
              >
                <Trash2 size={12} strokeWidth={1.5} />
                Delete page
              </button>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-xs uppercase tracking-wide text-grey">Layout grid</h2>
            <div className="flex items-center gap-2">
              <label className="flex flex-1 flex-col gap-1 text-xs text-grey">
                Rows
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={gridRows}
                  onChange={(e) => setGridSize(Number(e.target.value) || 1, gridCols)}
                  className="border border-grey-light px-2 py-1 text-sm outline-none focus:border-uq-purple"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs text-grey">
                Columns
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={gridCols}
                  onChange={(e) => setGridSize(gridRows, Number(e.target.value) || 1)}
                  className="border border-grey-light px-2 py-1 text-sm outline-none focus:border-uq-purple"
                />
              </label>
            </div>
          </div>

          <CollapsibleSection title="Blocks">
            <div className="flex flex-col gap-2">
              <div>
                <button
                  type="button"
                  onClick={() => setTextOpen((value) => !value)}
                  className="mb-1 flex w-full items-center justify-between border border-grey-light px-3 py-2 text-sm hover:border-uq-purple"
                >
                  Text
                  <ChevronDown
                    size={14}
                    strokeWidth={1.5}
                    className={`text-grey ${textOpen ? "rotate-0" : "-rotate-90"}`}
                  />
                </button>
                {textOpen && (
                  <div className="ml-2 flex flex-col gap-1">
                    {TEXT_KINDS.map((kind) => (
                      <TextKindItem key={kind} kind={kind} />
                    ))}
                  </div>
                )}
              </div>
              {BLOCK_OPTIONS.map((option) => (
                <SidebarItem key={option.type} {...option} />
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Design elements">
            <div className="flex flex-col gap-2">
              {DESIGN_ELEMENT_OPTIONS.map((option) => (
                <SidebarItem key={option.type} {...option} />
              ))}
            </div>
          </CollapsibleSection>

          <button
            type="button"
            onClick={onAddFiles}
            className="flex items-center justify-center gap-2 border border-grey-light px-3 py-2 text-sm hover:border-uq-purple hover:text-uq-purple"
          >
            <FilePlus size={16} strokeWidth={1.5} />
            Add more files
          </button>
        </div>
      )}

      {pendingDelete !== null && (
        <Modal title="Delete page?" onClose={() => setPendingDelete(null)}>
          <p className="mb-4 text-sm">
            Page {pendingDelete + 1} has blocks on it. Delete this page and its contents?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={confirmDelete}
              className="bg-uq-purple px-4 py-2 text-sm font-medium text-white"
            >
              Delete page
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="px-4 py-2 text-sm text-grey hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </aside>
  );
}
