"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  Check,
  Circle,
  Eye,
  FilePlus2,
  List,
  Minus,
  MoveRight,
  Image as ImageIcon,
  PenLine,
  Table,
  Type,
  X,
} from "lucide-react";
import type { BlockType } from "@/lib/types";
import { useStudioStore } from "@/lib/store";
import { DEFAULT_CONTENT } from "@/lib/editor-constants";
import { ViewSampleModal } from "./ViewSampleModal";

const BLOCK_OPTIONS: { type: BlockType; label: string; icon: typeof Type }[] = [
  { type: "text", label: "Text", icon: Type },
  { type: "table", label: "Table", icon: Table },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "divider", label: "Divider", icon: Minus },
];

const DESIGN_ELEMENT_OPTIONS: { type: BlockType; label: string; icon: typeof Type }[] = [
  { type: "line", label: "Straight line", icon: PenLine },
  { type: "arrow", label: "Arrow", icon: MoveRight },
  { type: "tick", label: "Tick", icon: Check },
  { type: "circle", label: "Circle", icon: Circle },
  { type: "cross", label: "Cross", icon: X },
  { type: "bullet", label: "Bullet point", icon: List },
];

function SidebarItem({
  type,
  label,
  icon: Icon,
}: {
  type: BlockType;
  label: string;
  icon: typeof Type;
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

export function Sidebar({ courseCode }: { courseCode: string }) {
  const gridRows = useStudioStore((s) => s.gridRows);
  const gridCols = useStudioStore((s) => s.gridCols);
  const setGridSize = useStudioStore((s) => s.setGridSize);
  const pageCount = useStudioStore((s) => s.pageCount);
  const addPage = useStudioStore((s) => s.addPage);
  const [showSample, setShowSample] = useState(false);

  return (
    <aside className="flex w-52 shrink-0 flex-col gap-6 overflow-y-auto border-r border-grey-light px-4 py-6">
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
        <button
          type="button"
          onClick={() => addPage()}
          className="mt-2 flex w-full items-center justify-center gap-2 border border-grey-light px-3 py-2 text-sm hover:border-uq-purple hover:text-uq-purple"
        >
          <FilePlus2 size={16} strokeWidth={1.5} />
          Add page ({pageCount})
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowSample(true)}
        className="flex items-center justify-center gap-2 border border-grey-light px-3 py-2 text-sm hover:border-uq-purple hover:text-uq-purple"
      >
        <Eye size={16} strokeWidth={1.5} />
        View sample
      </button>

      <div>
        <h2 className="mb-2 text-xs uppercase tracking-wide text-grey">Blocks</h2>
        <div className="flex flex-col gap-2">
          {BLOCK_OPTIONS.map((option) => (
            <SidebarItem key={option.type} {...option} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xs uppercase tracking-wide text-grey">Design elements</h2>
        <div className="flex flex-col gap-2">
          {DESIGN_ELEMENT_OPTIONS.map((option) => (
            <SidebarItem key={option.type} {...option} />
          ))}
        </div>
      </div>

      {showSample && (
        <ViewSampleModal courseCode={courseCode} onClose={() => setShowSample(false)} />
      )}
    </aside>
  );
}
