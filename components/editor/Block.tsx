"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useRef, useState } from "react";
import { Check, Circle, Highlighter, RotateCw, X } from "lucide-react";
import type { BlockType, CanvasBlock } from "@/lib/types";
import { clamp, snap } from "@/lib/editor-constants";
import { escapeHtml } from "@/lib/html-safe-text";

const MIN_WIDTH = 64;
const MIN_HEIGHT = 24;

const TEXT_COLOR_OPTIONS = [
  { label: "Black", value: "#171717" },
  { label: "UQ purple", value: "#51247A" },
  { label: "Red", value: "#dc2626" },
  { label: "Blue", value: "#2563eb" },
];
const HIGHLIGHT_OPTIONS = [
  { label: "None", value: "" },
  { label: "Purple tint", value: "#F3EAFB" },
  { label: "Yellow", value: "#FEF9C3" },
];
const BORDER_COLOR_OPTIONS = [
  { label: "Light", value: "#e5e5e5" },
  { label: "Dark", value: "#171717" },
  { label: "UQ purple", value: "#51247A" },
  { label: "Invisible", value: "transparent" },
];
const SHAPE_COLOR_OPTIONS = [
  { label: "Black", value: "#171717" },
  { label: "UQ purple", value: "#51247A" },
  { label: "Red", value: "#dc2626" },
  { label: "Green", value: "#16a34a" },
];
const DEFAULT_BORDER_COLOR = "#e5e5e5";
const SELECTED_BORDER_COLOR = "#51247A";
const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 48;

const EDITABLE_TYPES: BlockType[] = ["text", "bullet"];
const CONTENT_LESS_TYPES: BlockType[] = ["divider", "line", "arrow", "tick", "circle", "cross"];
const TEXT_COLORABLE_TYPES: BlockType[] = ["text", "bullet"];
const STROKE_ADJUSTABLE_TYPES: BlockType[] = ["line", "arrow"];
const FONT_RESIZABLE_TYPES: BlockType[] = ["text", "bullet"];
const SHAPE_COLORABLE_TYPES: BlockType[] = ["line", "arrow", "tick", "circle", "cross"];
const DEFAULT_SHAPE_COLOR: Record<string, string> = {
  line: "#171717",
  arrow: "#171717",
  tick: "#16a34a",
  circle: "#dc2626",
  cross: "#dc2626",
};

function BulletContent({
  content,
  editing,
  onCommit,
  fontSize,
  highlightColor,
}: {
  content: string;
  editing: boolean;
  onCommit: (value: string) => void;
  fontSize?: number;
  highlightColor?: string;
}) {
  const style = { fontSize: fontSize ?? DEFAULT_FONT_SIZE };
  if (editing) {
    return (
      <textarea
        autoFocus
        defaultValue={content}
        onBlur={(e) => onCommit(e.target.value)}
        style={style}
        className="h-full w-full resize-none p-2 outline-none"
      />
    );
  }
  return (
    <div
      className="flex h-full w-full items-start gap-1.5 overflow-hidden p-2"
      style={{ ...style, backgroundColor: highlightColor || undefined }}
    >
      <span>•</span>
      <span>{content || "Double-click to edit"}</span>
    </div>
  );
}

function ShapeContent({ block }: { block: CanvasBlock }) {
  const { type, width, height } = block;
  const color = block.shapeColor ?? DEFAULT_SHAPE_COLOR[type] ?? "#171717";
  const strokeWidth = block.strokeWidth ?? 3;
  // Icon size tracks the block's actual box so resize/zoom visibly changes it
  // — previously hardcoded at 24px regardless of block dimensions.
  const iconSize = clamp(Math.min(width, height) * 0.8, 12, 200);

  switch (type) {
    case "divider":
      return <hr className="mt-3 border-t border-foreground" />;
    case "line":
      return (
        <div className="flex h-full w-full items-center">
          <div className="w-full" style={{ borderTopWidth: strokeWidth, borderTopStyle: "solid", borderTopColor: color }} />
        </div>
      );
    case "arrow":
      return (
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full">
          <line x1={4} y1={20} x2={82} y2={20} stroke={color} strokeWidth={strokeWidth} />
          <polygon points="80,10 98,20 80,30" fill={color} />
        </svg>
      );
    case "tick":
      return (
        <div className="flex h-full w-full items-center justify-center">
          <Check size={iconSize} strokeWidth={3} style={{ color }} />
        </div>
      );
    case "circle":
      return (
        <div className="flex h-full w-full items-center justify-center">
          <Circle size={iconSize} strokeWidth={3} style={{ color }} />
        </div>
      );
    case "cross":
      return (
        <div className="flex h-full w-full items-center justify-center">
          <X size={iconSize} strokeWidth={3} style={{ color }} />
        </div>
      );
    default:
      return null;
  }
}

// Text block content is a small safe-HTML subset: plain (already-escaped)
// text plus <mark> spans from per-word highlighting — see lib/html-safe-text.
function TextContent({
  content,
  editing,
  onCommit,
  textColor,
  fontSize,
  contentRef,
  isHighlighting,
}: {
  content: string;
  editing: boolean;
  onCommit: (value: string) => void;
  textColor?: string;
  fontSize?: number;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  isHighlighting?: boolean;
}) {
  const textStyle = {
    color: textColor,
    fontSize: fontSize ?? DEFAULT_FONT_SIZE,
  };
  if (!editing) {
    return (
      <div
        ref={contentRef}
        className={`h-full w-full overflow-hidden whitespace-pre-wrap p-2 ${isHighlighting ? "cursor-text select-text" : ""}`}
        style={textStyle}
        dangerouslySetInnerHTML={{ __html: content || "Double-click to edit" }}
      />
    );
  }
  return (
    <textarea
      autoFocus
      defaultValue={content}
      onBlur={(e) => onCommit(e.target.value)}
      style={textStyle}
      className="h-full w-full resize-none p-2 outline-none"
    />
  );
}

function TableContent({
  content,
  onCommit,
}: {
  content: string;
  onCommit: (value: string) => void;
}) {
  const rows = (content || "Header 1 | Header 2\nRow 1 | Row 2")
    .split("\n")
    .map((row) => row.split("|").map((cell) => cell.trim()));

  function commitRows(next: string[][]) {
    onCommit(next.map((row) => row.join(" | ")).join("\n"));
  }

  function updateCell(rowIndex: number, colIndex: number, value: string) {
    commitRows(rows.map((row, r) => (r === rowIndex ? row.map((cell, c) => (c === colIndex ? value : cell)) : row)));
  }

  return (
    <table className="h-full w-full border-collapse text-xs table-fixed">
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className="border border-grey-light p-0">
                <input
                  value={cell}
                  onChange={(e) => updateCell(i, j, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="w-full px-1.5 py-0.5 text-xs outline-none"
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ImageContent({ content }: { content: string }) {
  if (content) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={content} alt="" className="h-full w-full object-cover" />;
  }
  return (
    <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-grey">
      Double-click to upload an image from your computer
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

function ColorPickerInput({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="color"
      title="Custom color"
      value={value && value !== "transparent" ? value : "#171717"}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      className="h-4 w-5 cursor-pointer border-0 p-0"
    />
  );
}

function ThicknessStepper({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (value: number) => void;
}) {
  const current = value ?? 3;
  return (
    <div className="flex items-center gap-1">
      <span className="text-grey">Thickness</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange(clamp(current - 1, 1, 12));
        }}
        className="flex h-4 w-4 items-center justify-center border border-grey-light leading-none"
      >
        −
      </button>
      <span className="w-3 text-center">{current}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange(clamp(current + 1, 1, 12));
        }}
        className="flex h-4 w-4 items-center justify-center border border-grey-light leading-none"
      >
        +
      </button>
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
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [pendingHighlightColor, setPendingHighlightColor] = useState<string>("#FEF9C3");
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: block.id,
      data: { source: "canvas" },
      // Drag is gated by conditionally spreading `listeners` below, not by
      // `disabled` — dnd-kit stamps aria-disabled="true" on this element
      // when disabled, which is wrong while a child input is actively
      // editable (assistive tech would treat the whole region, including
      // the editable field, as disabled).
    });

  const imageInputRef = useRef<HTMLInputElement>(null);

  function combinedRef(node: HTMLDivElement | null) {
    setNodeRef(node);
    nodeRef.current = node;
  }

  // Wraps the current text selection (if it's inside this block's content)
  // in a <mark> — the actual "highlight a word, not the whole box" action.
  // Uses the Selection/Range API directly rather than the deprecated
  // document.execCommand('hiliteColor', ...), which is inconsistent cross-browser.
  function applyHighlightToSelection() {
    const selection = window.getSelection();
    const el = contentRef.current;
    if (selection && el && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      if (el.contains(range.commonAncestorContainer)) {
        const mark = document.createElement("mark");
        mark.style.backgroundColor = pendingHighlightColor;
        try {
          range.surroundContents(mark);
        } catch {
          const extracted = range.extractContents();
          mark.appendChild(extracted);
          range.insertNode(mark);
        }
        selection.removeAllRanges();
        onChange({ content: el.innerHTML });
      }
    }
    setIsHighlighting(false);
  }

  function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange({ content: reader.result });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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

  // For text-capable blocks the corner handle scales font size instead of
  // the box — box size is adjusted separately via the edge-midpoint handles.
  function startFontResize(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const startFont = block.fontSize ?? DEFAULT_FONT_SIZE;

    function onMove(moveEvent: PointerEvent) {
      const fontSize = clamp(
        Math.round(startFont + (moveEvent.clientY - startY) * 0.15),
        MIN_FONT_SIZE,
        MAX_FONT_SIZE,
      );
      onChange({ fontSize });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startEdgeResize(e: React.PointerEvent, axis: "width" | "height") {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = block.width;
    const startHeight = block.height;

    function onMove(moveEvent: PointerEvent) {
      if (axis === "width") {
        onChange({ width: clamp(snap(startWidth + (moveEvent.clientX - startX)), MIN_WIDTH, 2000) });
      } else {
        onChange({ height: clamp(snap(startHeight + (moveEvent.clientY - startY)), MIN_HEIGHT, 2000) });
      }
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

  function getTableRows(): string[][] {
    return (block.content || "Header 1 | Header 2\nRow 1 | Row 2")
      .split("\n")
      .map((row) => row.split("|").map((cell) => cell.trim()));
  }
  function commitTableRows(rows: string[][]) {
    onChange({ content: rows.map((row) => row.join(" | ")).join("\n") });
  }
  function addTableRow() {
    const rows = getTableRows();
    commitTableRows([...rows, Array(rows[0]?.length ?? 2).fill("")]);
  }
  function removeTableRow() {
    const rows = getTableRows();
    if (rows.length <= 1) return;
    commitTableRows(rows.slice(0, -1));
  }
  function addTableCol() {
    commitTableRows(getTableRows().map((row) => [...row, ""]));
  }
  function removeTableCol() {
    const rows = getTableRows();
    if ((rows[0]?.length ?? 0) <= 1) return;
    commitTableRows(rows.map((row) => row.slice(0, -1)));
  }

  const canEdit = EDITABLE_TYPES.includes(block.type);
  const isBoxed = !CONTENT_LESS_TYPES.includes(block.type);
  const hasTextColorOptions = TEXT_COLORABLE_TYPES.includes(block.type);
  const hasShapeColorOptions = SHAPE_COLORABLE_TYPES.includes(block.type);
  const hasStrokeOptions = STROKE_ADJUSTABLE_TYPES.includes(block.type);
  const rotation = block.rotation ?? 0;
  const borderColor = isSelected
    ? SELECTED_BORDER_COLOR
    : (block.borderColor ?? (isBoxed ? DEFAULT_BORDER_COLOR : "transparent"));

  return (
    <div
      ref={combinedRef}
      {...(isEditing || isHighlighting ? {} : listeners)}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (block.type === "image") {
          imageInputRef.current?.click();
        } else if (canEdit) {
          setIsEditing(true);
        }
      }}
      onMouseUp={isHighlighting ? applyHighlightToSelection : undefined}
      style={{
        position: "absolute",
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        transform: `${CSS.Translate.toString(transform) ?? ""} rotate(${rotation}deg)`,
        borderColor: isHighlighting ? pendingHighlightColor : borderColor,
        zIndex: isDragging || isSelected ? 10 : 1,
      }}
      className={`group border ${isBoxed ? "bg-white" : ""} ${isEditing ? "" : "cursor-grab"}`}
    >
      {block.type === "text" && (
        <TextContent
          content={block.content}
          editing={isEditing}
          textColor={block.textColor}
          fontSize={block.fontSize}
          contentRef={contentRef}
          isHighlighting={isHighlighting}
          onCommit={(value) => {
            onChange({ content: escapeHtml(value) });
            setIsEditing(false);
          }}
        />
      )}
      {block.type === "table" && (
        <TableContent
          content={block.content}
          onCommit={(value) => onChange({ content: value })}
        />
      )}
      {block.type === "image" && (
        <>
          <ImageContent content={block.content} />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onClick={(e) => e.stopPropagation()}
            onChange={handleImageFileChange}
          />
        </>
      )}
      {block.type === "bullet" && (
        <BulletContent
          content={block.content}
          editing={isEditing}
          fontSize={block.fontSize}
          highlightColor={block.highlightColor}
          onCommit={(value) => {
            onChange({ content: value });
            setIsEditing(false);
          }}
        />
      )}
      {CONTENT_LESS_TYPES.includes(block.type) && <ShapeContent block={block} />}

      {isSelected && (hasTextColorOptions || isBoxed || hasShapeColorOptions) && (
        <div className="absolute bottom-full left-0 mb-2 flex w-max max-w-xs flex-wrap items-center gap-3 border border-grey-light bg-white px-2 py-1 text-xs">
          {hasTextColorOptions && (
            <>
              <SwatchRow
                label="Text"
                options={TEXT_COLOR_OPTIONS}
                activeValue={block.textColor}
                fallbackDisplay={TEXT_COLOR_OPTIONS[0].value}
                onPick={(value) => onChange({ textColor: value })}
              />
              <ColorPickerInput value={block.textColor} onChange={(value) => onChange({ textColor: value })} />
              {block.type === "bullet" ? (
                <SwatchRow
                  label="Highlight"
                  options={HIGHLIGHT_OPTIONS}
                  activeValue={block.highlightColor}
                  fallbackDisplay=""
                  onPick={(value) => onChange({ highlightColor: value })}
                />
              ) : isHighlighting ? (
                <span className="flex items-center gap-1 text-uq-purple">
                  <Highlighter size={12} strokeWidth={1.5} />
                  Select text to highlight
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHighlighting(false);
                    }}
                    className="ml-1 underline"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 text-grey">
                    <Highlighter size={12} strokeWidth={1.5} />
                    Highlight
                  </span>
                  {HIGHLIGHT_OPTIONS.filter((opt) => opt.value).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      title={`Highlight selection: ${opt.label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingHighlightColor(opt.value);
                        setIsHighlighting(true);
                      }}
                      style={{ backgroundColor: opt.value }}
                      className="h-4 w-4 rounded-full border border-grey-light"
                    />
                  ))}
                </div>
              )}
            </>
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
          {block.type === "table" && (
            <>
              <div className="flex items-center gap-1">
                <span className="text-grey">Rows</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); removeTableRow(); }} className="flex h-4 w-4 items-center justify-center border border-grey-light leading-none">−</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); addTableRow(); }} className="flex h-4 w-4 items-center justify-center border border-grey-light leading-none">+</button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-grey">Cols</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); removeTableCol(); }} className="flex h-4 w-4 items-center justify-center border border-grey-light leading-none">−</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); addTableCol(); }} className="flex h-4 w-4 items-center justify-center border border-grey-light leading-none">+</button>
              </div>
            </>
          )}
          {hasShapeColorOptions && (
            <>
              <SwatchRow
                label="Color"
                options={SHAPE_COLOR_OPTIONS}
                activeValue={block.shapeColor}
                fallbackDisplay={DEFAULT_SHAPE_COLOR[block.type] ?? "#171717"}
                onPick={(value) => onChange({ shapeColor: value })}
              />
              <ColorPickerInput value={block.shapeColor} onChange={(value) => onChange({ shapeColor: value })} />
            </>
          )}
          {hasStrokeOptions && (
            <ThicknessStepper
              value={block.strokeWidth}
              onChange={(value) => onChange({ strokeWidth: value })}
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
            className="absolute -top-28 left-1/2 flex h-5 w-5 -translate-x-1/2 cursor-grab items-center justify-center rounded-full bg-uq-purple text-white"
          >
            <RotateCw size={12} strokeWidth={2} />
          </div>
          {FONT_RESIZABLE_TYPES.includes(block.type) ? (
            <>
              <div
                onPointerDown={startFontResize}
                title="Drag to resize text"
                className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize bg-uq-purple"
              />
              <div
                onPointerDown={(e) => startEdgeResize(e, "width")}
                title="Drag to resize box width"
                className="absolute -right-1 top-1/2 h-3 w-3 -translate-y-1/2 cursor-ew-resize bg-white border border-uq-purple"
              />
              <div
                onPointerDown={(e) => startEdgeResize(e, "height")}
                title="Drag to resize box height"
                className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 cursor-ns-resize bg-white border border-uq-purple"
              />
            </>
          ) : (
            <div
              onPointerDown={startResize}
              title="Drag to resize"
              className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize bg-uq-purple"
            />
          )}
        </>
      )}
    </div>
  );
}
