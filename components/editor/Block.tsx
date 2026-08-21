"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { X } from "lucide-react";
import type { CanvasBlock } from "@/lib/types";
import { clamp, snap } from "@/lib/editor-constants";

const MIN_WIDTH = 64;
const MIN_HEIGHT = 24;

function TextContent({
  content,
  editing,
  onCommit,
}: {
  content: string;
  editing: boolean;
  onCommit: (value: string) => void;
}) {
  if (!editing) {
    return (
      <div className="h-full w-full overflow-hidden whitespace-pre-wrap p-2 text-sm">
        {content || "Double-click to edit"}
      </div>
    );
  }
  return (
    <textarea
      autoFocus
      defaultValue={content}
      onBlur={(e) => onCommit(e.target.value)}
      className="h-full w-full resize-none p-2 text-sm outline-none"
    />
  );
}

function TableContent({
  content,
  editing,
  onCommit,
}: {
  content: string;
  editing: boolean;
  onCommit: (value: string) => void;
}) {
  if (editing) {
    return (
      <textarea
        autoFocus
        defaultValue={content}
        onBlur={(e) => onCommit(e.target.value)}
        placeholder="Header 1 | Header 2\nRow 1 | Row 2"
        className="h-full w-full resize-none p-2 text-xs outline-none"
      />
    );
  }
  const rows = (content || "Header 1 | Header 2\nRow 1 | Row 2")
    .split("\n")
    .map((row) => row.split("|").map((cell) => cell.trim()));
  return (
    <table className="h-full w-full border-collapse text-xs">
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className="border border-grey-light px-1.5 py-0.5">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ImageContent({
  content,
  editing,
  onCommit,
}: {
  content: string;
  editing: boolean;
  onCommit: (value: string) => void;
}) {
  if (editing) {
    return (
      <input
        autoFocus
        defaultValue={content}
        onBlur={(e) => onCommit(e.target.value)}
        placeholder="Image URL"
        className="w-full border-b border-grey-light p-2 text-xs outline-none"
      />
    );
  }
  if (content) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={content} alt="" className="h-full w-full object-cover" />;
  }
  return (
    <div className="flex h-full w-full items-center justify-center text-xs text-grey">
      Double-click to add an image URL
    </div>
  );
}

export function Block({
  block,
  isSelected,
  onSelect,
  onChange,
  onDelete,
}: {
  block: CanvasBlock;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<CanvasBlock>) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: block.id,
      data: { source: "canvas" },
      disabled: isEditing,
    });

  function startResize(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = block.width;
    const startHeight = block.height;

    function onMove(moveEvent: PointerEvent) {
      const width = clamp(
        snap(startWidth + (moveEvent.clientX - startX)),
        MIN_WIDTH,
        2000,
      );
      const height = clamp(
        snap(startHeight + (moveEvent.clientY - startY)),
        MIN_HEIGHT,
        2000,
      );
      onChange({ width, height });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const canEdit = block.type !== "divider";

  return (
    <div
      ref={setNodeRef}
      {...(isEditing ? {} : listeners)}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (canEdit) setIsEditing(true);
      }}
      style={{
        position: "absolute",
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging || isSelected ? 10 : 1,
      }}
      className={`group border ${isSelected ? "border-uq-purple" : "border-grey-light"} bg-white ${isEditing ? "" : "cursor-grab"}`}
    >
      {block.type === "text" && (
        <TextContent
          content={block.content}
          editing={isEditing}
          onCommit={(value) => {
            onChange({ content: value });
            setIsEditing(false);
          }}
        />
      )}
      {block.type === "table" && (
        <TableContent
          content={block.content}
          editing={isEditing}
          onCommit={(value) => {
            onChange({ content: value });
            setIsEditing(false);
          }}
        />
      )}
      {block.type === "image" && (
        <ImageContent
          content={block.content}
          editing={isEditing}
          onCommit={(value) => {
            onChange({ content: value });
            setIsEditing(false);
          }}
        />
      )}
      {block.type === "divider" && (
        <hr className="mt-3 border-t border-foreground" />
      )}

      {isSelected && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete block"
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center bg-uq-purple text-white"
          >
            <X size={12} strokeWidth={2} />
          </button>
          <div
            onPointerDown={startResize}
            className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize bg-uq-purple"
          />
        </>
      )}
    </div>
  );
}
