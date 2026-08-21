"use client";

import { useDraggable } from "@dnd-kit/core";
import { Minus, Image as ImageIcon, Table, Type } from "lucide-react";
import type { BlockType } from "@/lib/types";

const BLOCK_OPTIONS: { type: BlockType; label: string; icon: typeof Type }[] = [
  { type: "text", label: "Text", icon: Type },
  { type: "table", label: "Table", icon: Table },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "divider", label: "Divider", icon: Minus },
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
      className={`flex w-full items-center gap-2 border border-grey-light px-3 py-2 text-sm hover:border-uq-purple hover:text-uq-purple ${isDragging ? "opacity-40" : ""}`}
    >
      <Icon size={16} strokeWidth={1.5} />
      {label}
    </button>
  );
}

export function Sidebar() {
  return (
    <aside className="flex w-48 shrink-0 flex-col gap-2 border-r border-grey-light px-4 py-6">
      <h2 className="mb-2 text-xs uppercase tracking-wide text-grey">Blocks</h2>
      {BLOCK_OPTIONS.map((option) => (
        <SidebarItem key={option.type} {...option} />
      ))}
    </aside>
  );
}
