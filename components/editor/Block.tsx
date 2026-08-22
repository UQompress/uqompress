"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Check, Circle, X } from "lucide-react";
import type { BlockType, CanvasBlock } from "@/lib/types";
import { clamp, snap } from "@/lib/editor-constants";

const MIN_WIDTH = 64;
const MIN_HEIGHT = 24;

const TEXT_COLOR_OPTIONS = [
  { label: "Black", value: "#171717" },
  { label: "UQ purple", value: "#51247A" },
];
const HIGHLIGHT_OPTIONS = [
  { label: "None", value: "" },
  { label: "Purple tint", value: "#F3EAFB" },
];

const EDITABLE_TYPES: BlockType[] = ["text", "table", "image", "bullet"];
const CONTENT_LESS_TYPES: BlockType[] = ["divider", "line", "curve", "arrow", "tick", "circle", "cross"];

function BulletContent({
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
        className="h-full w-full resize-none p-2 text-sm outline-none"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-start gap-1.5 overflow-hidden p-2 text-sm">
      <span>•</span>
      <span>{content || "Double-click to edit"}</span>
    </div>
  );
}

function ShapeContent({ type }: { type: BlockType }) {
  switch (type) {
    case "divider":
      return <hr className="mt-3 border-t border-foreground" />;
    case "line":
      return (
        <div className="flex h-full w-full items-center">
          <div className="w-full border-t-2 border-foreground" />
        </div>
      );
    case "curve":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <path d="M2,90 Q50,-10 98,90" fill="none" stroke="#171717" strokeWidth={3} />
        </svg>
      );
    case "arrow":
      return (
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full">
          <line x1={4} y1={20} x2={82} y2={20} stroke="#171717" strokeWidth={3} />
          <polygon points="80,10 98,20 80,30" fill="#171717" />
        </svg>
      );
    case "tick":
      return (
        <div className="flex h-full w-full items-center justify-center">
          <Check size={24} strokeWidth={3} style={{ color: "#16a34a" }} />
        </div>
      );
    case "circle":
      return (
        <div className="flex h-full w-full items-center justify-center">
          <Circle size={24} strokeWidth={3} style={{ color: "#dc2626" }} />
        </div>
      );
    case "cross":
      return (
        <div className="flex h-full w-full items-center justify-center">
          <X size={24} strokeWidth={3} style={{ color: "#dc2626" }} />
        </div>
      );
    default:
      return null;
  }
}

function TextContent({
  content,
  editing,
  onCommit,
  textColor,
  highlightColor,
}: {
  content: string;
  editing: boolean;
  onCommit: (value: string) => void;
  textColor?: string;
  highlightColor?: string;
}) {
  if (!editing) {
    return (
      <div
        className="h-full w-full overflow-hidden whitespace-pre-wrap p-2 text-sm"
        style={{ color: textColor, backgroundColor: highlightColor || undefined }}
      >
        {content || "Double-click to edit"}
      </div>
    );
  }
  return (
    <textarea
      autoFocus
      defaultValue={content}
      onBlur={(e) => onCommit(e.target.value)}
      style={{ color: textColor, backgroundColor: highlightColor || undefined }}
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

  const canEdit = EDITABLE_TYPES.includes(block.type);
  const isBoxed = !CONTENT_LESS_TYPES.includes(block.type);

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
      className={`group border ${isSelected ? "border-uq-purple" : isBoxed ? "border-grey-light" : "border-transparent"} ${isBoxed ? "bg-white" : ""} ${isEditing ? "" : "cursor-grab"}`}
    >
      {block.type === "text" && (
        <TextContent
          content={block.content}
          editing={isEditing}
          textColor={block.textColor}
          highlightColor={block.highlightColor}
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
      {block.type === "bullet" && (
        <BulletContent
          content={block.content}
          editing={isEditing}
          onCommit={(value) => {
            onChange({ content: value });
            setIsEditing(false);
          }}
        />
      )}
      {CONTENT_LESS_TYPES.includes(block.type) && <ShapeContent type={block.type} />}

      {isSelected && block.type === "text" && (
        <div className="absolute -top-9 left-0 flex items-center gap-2 bg-white px-2 py-1 text-xs shadow-none border border-grey-light">
          <span className="text-grey">Text</span>
          {TEXT_COLOR_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              title={opt.label}
              onClick={(e) => {
                e.stopPropagation();
                onChange({ textColor: opt.value });
              }}
              style={{ backgroundColor: opt.value }}
              className={`h-4 w-4 rounded-full border ${block.textColor === opt.value ? "border-2 border-black" : "border-grey-light"}`}
            />
          ))}
          <span className="ml-2 text-grey">Highlight</span>
          {HIGHLIGHT_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              title={opt.label}
              onClick={(e) => {
                e.stopPropagation();
                onChange({ highlightColor: opt.value });
              }}
              style={{ backgroundColor: opt.value || "#ffffff" }}
              className={`h-4 w-4 rounded-full border ${block.highlightColor === opt.value ? "border-2 border-black" : "border-grey-light"}`}
            />
          ))}
        </div>
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
