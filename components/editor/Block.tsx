"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useRef, useState } from "react";
import { Check, Circle, RotateCw, X } from "lucide-react";
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
const BORDER_COLOR_OPTIONS = [
  { label: "Light", value: "#e5e5e5" },
  { label: "Dark", value: "#171717" },
  { label: "UQ purple", value: "#51247A" },
  { label: "Invisible", value: "transparent" },
];
const DEFAULT_BORDER_COLOR = "#e5e5e5";
const SELECTED_BORDER_COLOR = "#51247A";

const EDITABLE_TYPES: BlockType[] = ["text", "table", "image", "bullet"];
const CONTENT_LESS_TYPES: BlockType[] = ["divider", "line", "curve", "arrow", "tick", "circle", "cross"];
const TEXT_COLORABLE_TYPES: BlockType[] = ["text", "bullet"];

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

function SwatchRow({
  label,
  options,
  activeValue,
  fallbackDisplay,
  onPick,
}: {
  label: string;
  options: { label: string; value: string }[];
  activeValue: string | undefined;
  fallbackDisplay: string;
  onPick: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-grey">{label}</span>
      {options.map((opt) => {
        const isActive = (activeValue ?? fallbackDisplay) === opt.value;
        const isInvisible = opt.value === "transparent";
        return (
          <button
            key={opt.label}
            type="button"
            title={opt.label}
            onClick={(e) => {
              e.stopPropagation();
              onPick(opt.value);
            }}
            style={{
              backgroundColor: opt.value === "" || isInvisible ? "#ffffff" : opt.value,
              borderStyle: isInvisible ? "dashed" : "solid",
            }}
            className={`h-4 w-4 rounded-full border ${isActive ? "border-2 border-black" : "border-grey-light"}`}
          />
        );
      })}
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
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: block.id,
      data: { source: "canvas" },
      disabled: isEditing,
    });

  function combinedRef(node: HTMLDivElement | null) {
    setNodeRef(node);
    nodeRef.current = node;
  }

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

  function startRotate(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    const rect = nodeRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    function onMove(moveEvent: PointerEvent) {
      const angleRad = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      const deg = Math.round((angleRad * (180 / Math.PI) + 90) / 5) * 5;
      onChange({ rotation: deg });
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
  const hasTextColorOptions = TEXT_COLORABLE_TYPES.includes(block.type);
  const rotation = block.rotation ?? 0;
  const borderColor = isSelected
    ? SELECTED_BORDER_COLOR
    : (block.borderColor ?? (isBoxed ? DEFAULT_BORDER_COLOR : "transparent"));

  return (
    <div
      ref={combinedRef}
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
        transform: `${CSS.Translate.toString(transform) ?? ""} rotate(${rotation}deg)`,
        borderColor,
        zIndex: isDragging || isSelected ? 10 : 1,
      }}
      className={`group border ${isBoxed ? "bg-white" : ""} ${isEditing ? "" : "cursor-grab"}`}
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

      {isSelected && (hasTextColorOptions || isBoxed) && (
        <div className="absolute -top-9 left-0 flex items-center gap-3 whitespace-nowrap border border-grey-light bg-white px-2 py-1 text-xs">
          {hasTextColorOptions && (
            <SwatchRow
              label="Text"
              options={TEXT_COLOR_OPTIONS}
              activeValue={block.textColor}
              fallbackDisplay={TEXT_COLOR_OPTIONS[0].value}
              onPick={(value) => onChange({ textColor: value })}
            />
          )}
          {hasTextColorOptions && (
            <SwatchRow
              label="Highlight"
              options={HIGHLIGHT_OPTIONS}
              activeValue={block.highlightColor}
              fallbackDisplay=""
              onPick={(value) => onChange({ highlightColor: value })}
            />
          )}
          {isBoxed && (
            <SwatchRow
              label="Border"
              options={BORDER_COLOR_OPTIONS}
              activeValue={block.borderColor}
              fallbackDisplay={DEFAULT_BORDER_COLOR}
              onPick={(value) => onChange({ borderColor: value })}
            />
          )}
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
            onPointerDown={startRotate}
            title="Drag to rotate"
            className="absolute -top-16 left-1/2 flex h-5 w-5 -translate-x-1/2 cursor-grab items-center justify-center rounded-full bg-uq-purple text-white"
          >
            <RotateCw size={12} strokeWidth={2} />
          </div>
          <div
            onPointerDown={startResize}
            title="Drag to resize"
            className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize bg-uq-purple"
          />
        </>
      )}
    </div>
  );
}
