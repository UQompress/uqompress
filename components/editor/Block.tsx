"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Circle, RotateCw, X } from "lucide-react";
import type { BlockType, CanvasBlock, TextBlockKind } from "@/lib/types";
import {
  DEFAULT_FONT_SIZE,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  TEXT_KIND_DEFAULTS,
  TEXT_KIND_LABELS,
  clamp,
  snap,
} from "@/lib/editor-constants";
import { htmlToPlainText, applyLabelBeforeColon } from "@/lib/rich-text";
import { TextBlockEditor } from "./TextBlockEditor";
import { useStudioStore } from "@/lib/store";

const MIN_WIDTH = 64;
const MIN_HEIGHT = 14;

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

const CONTENT_LESS_TYPES: BlockType[] = ["divider", "line", "arrow", "tick", "circle", "cross"];
const STROKE_ADJUSTABLE_TYPES: BlockType[] = ["line", "arrow"];
const FONT_RESIZABLE_TYPES: BlockType[] = ["text"];
const SHAPE_COLORABLE_TYPES: BlockType[] = ["line", "arrow", "tick", "circle", "cross"];
const DEFAULT_SHAPE_COLOR: Record<string, string> = {
  line: "#171717",
  arrow: "#171717",
  tick: "#16a34a",
  circle: "#dc2626",
  cross: "#dc2626",
};

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
  zoom = 1,
}: {
  block: CanvasBlock;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<CanvasBlock>, opts?: { transient?: boolean; coalesceKey?: string }) => void;
  onDelete: () => void;
  zoom?: number;
}) {
  const captureHistory = useStudioStore((s) => s.captureHistory);
  const [overlayRect, setOverlayRect] = useState<DOMRect | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);
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
  const isText = block.type === "text";
  const dragListeners = isText && isSelected ? {} : listeners;

  function combinedRef(node: HTMLDivElement | null) {
    setNodeRef(node);
    nodeRef.current = node;
  }

  // The selection toolbar + delete/rotate/resize handles used to be rendered
  // as normal children of this block's div. That's what caused "editing one
  // small block makes other small blocks disappear": a selected block gets
  // zIndex 10, and since the toolbar is a DESCENDANT of that elevated
  // stacking context, it painted above every OTHER block on the page too —
  // including a sibling block sitting right above it, which the toolbar's
  // opaque background then visually covered (still in the DOM, just hidden).
  // Fix: render them through a portal into document.body with `position:
  // fixed`, positioned from this block's live on-screen rect. That fully
  // decouples them from any block's stacking context, and getBoundingClientRect
  // already accounts for the canvas zoom transform, scroll, everything.
  useLayoutEffect(() => {
    // No need to clear overlayRect when deselected — the render guard below
    // is `isSelected && overlayRect && ...`, so a stale rect is harmless
    // once isSelected is false; it just won't be read again until reselected.
    if (!isSelected) return;
    function measure() {
      if (nodeRef.current) setOverlayRect(nodeRef.current.getBoundingClientRect());
    }
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [isSelected, block.x, block.y, block.width, block.height, block.rotation, zoom]);

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

  function changeTextKind(kind: TextBlockKind) {
    const defaults = TEXT_KIND_DEFAULTS[kind];
    const patch: Partial<CanvasBlock> = {
      textKind: kind,
      fontSize: defaults.fontSize,
      textColor: defaults.color,
    };
    if ((kind === "body" || kind === "subbody") && !block.manualLabelFormat) {
      patch.content = applyLabelBeforeColon(htmlToPlainText(block.content));
    }
    onChange(patch);
  }

  function startGeometryChange(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    captureHistory();
  }

  function startResize(e: React.PointerEvent) {
    startGeometryChange(e);
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
      onChange({ width, height }, { transient: true });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // For text-capable blocks the corner handle scales font size AND the box
  // together (proportionally, so the box grows/shrinks along with the text
  // instead of the text overflowing a fixed box) — box-only resize is still
  // available separately via the edge-midpoint handles below.
  function startFontResize(e: React.PointerEvent) {
    startGeometryChange(e);
    const startY = e.clientY;
    const startFont = block.fontSize ?? DEFAULT_FONT_SIZE;
    const startWidth = block.width;
    const startHeight = block.height;

    function onMove(moveEvent: PointerEvent) {
      const fontSize = clamp(
        Math.round((startFont + (moveEvent.clientY - startY) * 0.08) * 2) / 2,
        MIN_FONT_SIZE,
        MAX_FONT_SIZE,
      );
      const ratio = fontSize / startFont;
      const width = clamp(Math.round(startWidth * ratio), MIN_WIDTH, 2000);
      const height = clamp(Math.round(startHeight * ratio), MIN_HEIGHT, 2000);
      onChange({ fontSize, width, height }, { transient: true });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startEdgeResize(e: React.PointerEvent, axis: "width" | "height") {
    startGeometryChange(e);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = block.width;
    const startHeight = block.height;

    function onMove(moveEvent: PointerEvent) {
      if (axis === "width") {
        onChange(
          { width: clamp(snap(startWidth + (moveEvent.clientX - startX)), MIN_WIDTH, 2000) },
          { transient: true },
        );
      } else {
        onChange(
          { height: clamp(snap(startHeight + (moveEvent.clientY - startY)), MIN_HEIGHT, 2000) },
          { transient: true },
        );
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
    startGeometryChange(e);
    const rect = nodeRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    function onMove(moveEvent: PointerEvent) {
      const angleRad = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      const deg = Math.round((angleRad * (180 / Math.PI) + 90) / 5) * 5;
      onChange({ rotation: deg }, { transient: true });
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

  const isBoxed = !CONTENT_LESS_TYPES.includes(block.type);
  const hasShapeColorOptions = SHAPE_COLORABLE_TYPES.includes(block.type);
  const hasStrokeOptions = STROKE_ADJUSTABLE_TYPES.includes(block.type);
  const rotation = block.rotation ?? 0;
  const isTopic = isText && block.textKind === "topic";
  const borderColor = isSelected
    ? SELECTED_BORDER_COLOR
    : (block.borderColor ?? (isBoxed && !isTopic ? DEFAULT_BORDER_COLOR : "transparent"));

  const showToolbar = isSelected && (isText || isBoxed || hasShapeColorOptions);

  return (
    <div
      ref={combinedRef}
      {...dragListeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (block.type === "image") {
          imageInputRef.current?.click();
        }
      }}
      style={{
        position: "absolute",
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        transform: `${CSS.Translate.toString(transform) ?? ""} rotate(${rotation}deg)`,
        borderColor,
        background: isTopic ? TEXT_KIND_DEFAULTS.topic.background : undefined,
        zIndex: isDragging || isSelected ? 10 : 1,
      }}
      className={`group border ${isBoxed && !isTopic ? "bg-white" : ""} ${
        isText && isSelected ? "cursor-text" : "cursor-grab"
      }`}
    >
      {isText && isSelected && (
        <div
          {...listeners}
          title="Drag to move"
          className="absolute top-0 bottom-0 left-0 z-10 w-1.5 cursor-grab bg-uq-purple/40"
        />
      )}
      {block.type === "text" && (
        <TextBlockEditor block={block} onChange={onChange} />
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
      {CONTENT_LESS_TYPES.includes(block.type) && <ShapeContent block={block} />}

      {isSelected &&
        overlayRect &&
        createPortal(
          <>
            {showToolbar && (
              <div
                style={{
                  position: "fixed",
                  left: overlayRect.left,
                  top: overlayRect.top - 8,
                  transform: "translateY(-100%)",
                  zIndex: 40,
                }}
                className="flex w-max max-w-xs flex-wrap items-center gap-3 border border-grey-light bg-white px-2 py-1 text-xs"
              >
                {isText && (
                  <label className="flex items-center gap-1 text-grey">
                    Type
                    <select
                      value={block.textKind ?? "body"}
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) => changeTextKind(e.target.value as TextBlockKind)}
                      className="border border-grey-light bg-white px-1 py-0.5 text-xs text-foreground outline-none"
                    >
                      {(Object.keys(TEXT_KIND_LABELS) as TextBlockKind[]).map((kind) => (
                        <option key={kind} value={kind}>
                          {TEXT_KIND_LABELS[kind]}
                        </option>
                      ))}
                    </select>
                  </label>
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

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Delete block"
              style={{
                position: "fixed",
                left: overlayRect.right,
                top: overlayRect.top,
                transform: "translate(-50%, -50%)",
                zIndex: 40,
              }}
              className="flex h-5 w-5 items-center justify-center bg-uq-purple text-white"
            >
              <X size={12} strokeWidth={2} />
            </button>
            <div
              onPointerDown={startRotate}
              title="Drag to rotate"
              style={{
                position: "fixed",
                left: overlayRect.left + overlayRect.width / 2,
                top: overlayRect.top - 112,
                transform: "translateX(-50%)",
                zIndex: 40,
              }}
              className="flex h-5 w-5 cursor-grab items-center justify-center rounded-full bg-uq-purple text-white"
            >
              <RotateCw size={12} strokeWidth={2} />
            </div>
            {FONT_RESIZABLE_TYPES.includes(block.type) ? (
              <>
                <div
                  onPointerDown={startFontResize}
                  title="Drag to resize text and box together"
                  style={{
                    position: "fixed",
                    left: overlayRect.right,
                    top: overlayRect.bottom,
                    transform: "translate(-50%, -50%)",
                    zIndex: 40,
                  }}
                  className="h-3 w-3 cursor-nwse-resize bg-uq-purple"
                />
                <div
                  onPointerDown={(e) => startEdgeResize(e, "width")}
                  title="Drag to resize box width only"
                  style={{
                    position: "fixed",
                    left: overlayRect.right,
                    top: overlayRect.top + overlayRect.height / 2,
                    transform: "translate(-50%, -50%)",
                    zIndex: 40,
                  }}
                  className="h-3 w-3 cursor-ew-resize border border-uq-purple bg-white"
                />
                <div
                  onPointerDown={(e) => startEdgeResize(e, "height")}
                  title="Drag to resize box height only"
                  style={{
                    position: "fixed",
                    left: overlayRect.left + overlayRect.width / 2,
                    top: overlayRect.bottom,
                    transform: "translate(-50%, -50%)",
                    zIndex: 40,
                  }}
                  className="h-3 w-3 cursor-ns-resize border border-uq-purple bg-white"
                />
              </>
            ) : (
              <div
                onPointerDown={startResize}
                title="Drag to resize"
                style={{
                  position: "fixed",
                  left: overlayRect.right,
                  top: overlayRect.bottom,
                  transform: "translate(-50%, -50%)",
                  zIndex: 40,
                }}
                className="h-3 w-3 cursor-nwse-resize bg-uq-purple"
              />
            )}
          </>,
          document.body,
        )}
    </div>
  );
}
