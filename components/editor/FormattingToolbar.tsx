"use client";

import { useEffect, useRef, useState } from "react";
import { ColorBar, ToolbarIcon } from "@/components/editor/ToolbarIcon";
import { DEFAULT_FONT_SIZE, clamp, clampFontSize, stepFontSize } from "@/lib/editor-constants";
import { getSelectionFontSizesPx, wrapSelectionInSpan } from "@/lib/rich-text";
import { useStudioStore } from "@/lib/store";
import type { CanvasBlock } from "@/lib/types";

const FONT_SWATCHES = ["#171717", "#51247A", "#dc2626", "#2563eb", "#16a34a", "#d97706", "#ffffff"];
const HIGHLIGHT_SWATCHES = ["#FEF9C3", "#F3EAFB", "#FECACA", "#BBF7D0", "#BFDBFE", "#E5E5E5"];
const INK_SWATCHES = ["#171717", "#51247A", "#dc2626", "#2563eb", "#16a34a", "#d97706"];

function Divider() {
  return <div className="mx-1 h-6 w-px bg-grey-light" />;
}

function ToolButton({
  label,
  disabled,
  pressed,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-sm ${
        pressed ? "bg-grey-light" : "hover:bg-zinc-100"
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function readCommandState(command: string): boolean {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

function findEditingBlock(): HTMLElement | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const node = selection.anchorNode;
  const el = node instanceof Element ? node : node?.parentElement;
  return el?.closest("[data-text-block-id]") ?? null;
}

function syncEditingBlock(
  updateBlock: (id: string, patch: Partial<CanvasBlock>) => void,
  extra?: Partial<CanvasBlock>,
  fromEl?: HTMLElement | null,
) {
  const host =
    fromEl?.closest("[data-text-block-id]") ??
    findEditingBlock();
  if (!(host instanceof HTMLElement)) return;
  const id = host.dataset.textBlockId;
  if (!id) return;
  updateBlock(id, { content: host.innerHTML, manualLabelFormat: true, ...extra });
}

export function FormattingToolbar({
  disabled,
  selectedBlock,
}: {
  disabled?: boolean;
  selectedBlock: CanvasBlock | null;
}) {
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const past = useStudioStore((s) => s.past);
  const future = useStudioStore((s) => s.future);
  const updateBlock = useStudioStore((s) => s.updateBlock);

  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [fontSizeDisplay, setFontSizeDisplay] = useState<string>(String(DEFAULT_FONT_SIZE));
  const [fontColor, setFontColor] = useState("#171717");
  const [highlightColor, setHighlightColor] = useState("#FEF9C3");
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const annotationMode = useStudioStore((s) => s.annotationMode);
  const setAnnotationMode = useStudioStore((s) => s.setAnnotationMode);
  const annotationColor = useStudioStore((s) => s.annotationColor);
  const setAnnotationColor = useStudioStore((s) => s.setAnnotationColor);
  const annotationStrokeWidth = useStudioStore((s) => s.annotationStrokeWidth);
  const setAnnotationStrokeWidth = useStudioStore((s) => s.setAnnotationStrokeWidth);
  const savedRangeRef = useRef<Range | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;
  const inactive = Boolean(disabled);

  useEffect(() => {
    function handleSelectionChange() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const node = selection.anchorNode;
      const el = node instanceof Element ? node : node?.parentElement;
      if (el && toolbarRef.current?.contains(el)) return;
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
      setBold(readCommandState("bold"));
      setItalic(readCommandState("italic"));
      setUnderline(readCommandState("underline"));
      const sizes = getSelectionFontSizesPx();
      if (sizes.length === 0) {
        const fallback = selectedBlock?.fontSize ?? DEFAULT_FONT_SIZE;
        setFontSizeDisplay(String(fallback));
      } else if (sizes.length === 1) {
        setFontSizeDisplay(String(sizes[0]));
      } else {
        setFontSizeDisplay("");
      }
    }
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [selectedBlock?.fontSize]);

  useEffect(() => {
    if (inactive && annotationMode) setAnnotationMode(false);
  }, [inactive, annotationMode, setAnnotationMode]);

  const [trackedBlockId, setTrackedBlockId] = useState(selectedBlock?.id);
  if (selectedBlock?.id !== trackedBlockId) {
    setTrackedBlockId(selectedBlock?.id);
    setFontSizeDisplay(String(selectedBlock?.fontSize ?? DEFAULT_FONT_SIZE));
    if (selectedBlock?.textColor) setFontColor(selectedBlock.textColor);
  }

  function restoreRange() {
    const range = savedRangeRef.current;
    const selection = window.getSelection();
    if (!range || !selection) return false;
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  function runCommand(command: string, value?: string) {
    if (inactive) return;
    restoreRange();
    document.execCommand(command, false, value);
    syncEditingBlock(updateBlock);
    setBold(readCommandState("bold"));
    setItalic(readCommandState("italic"));
    setUnderline(readCommandState("underline"));
  }

  function applyFontSize(raw: number) {
    if (inactive) return;
    const size = clampFontSize(raw);
    setFontSizeDisplay(String(size));
    restoreRange();
    const wrapped = wrapSelectionInSpan({ fontSize: `${size}px` });
    if (wrapped) {
      syncEditingBlock(updateBlock);
      return;
    }
    if (selectedBlock?.type === "text") {
      updateBlock(selectedBlock.id, { fontSize: size });
    }
  }

  function applyFontColor(color: string) {
    if (inactive) return;
    setFontColor(color);
    restoreRange();
    const wrapped = wrapSelectionInSpan({ color });
    if (wrapped) {
      syncEditingBlock(updateBlock);
      return;
    }
    document.execCommand("foreColor", false, color);
    if (selectedBlock?.type === "text") {
      const el = findEditingBlock();
      updateBlock(selectedBlock.id, {
        textColor: color,
        content: el?.innerHTML ?? selectedBlock.content,
        manualLabelFormat: true,
      });
    }
  }

  function applyHighlight(color: string) {
    if (inactive) return;
    setHighlightColor(color);
    restoreRange();
    const wrapped = wrapSelectionInSpan({ backgroundColor: color });
    if (wrapped) {
      syncEditingBlock(updateBlock);
      return;
    }
    document.execCommand("hiliteColor", false, color);
    syncEditingBlock(updateBlock);
  }

  const numericSize = fontSizeDisplay === "" ? DEFAULT_FONT_SIZE : Number(fontSizeDisplay);
  const stepperBase = Number.isFinite(numericSize) ? numericSize : DEFAULT_FONT_SIZE;

  return (
    <div
      ref={toolbarRef}
      className={`flex h-11 shrink-0 items-center gap-0.5 border-b border-grey-light px-4 ${
        inactive ? "pointer-events-none opacity-40" : ""
      }`}
    >
      <ToolButton
        label="Search"
        onClick={() => {
          // TODO: wire search across cheat sheet text
        }}
      >
        <ToolbarIcon file="Search.svg" alt="" className="h-4 w-4" />
      </ToolButton>

      <Divider />

      <ToolButton label="Undo" disabled={!canUndo} onClick={() => undo()}>
        <ToolbarIcon file="Undo.svg" alt="" className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Redo" disabled={!canRedo} onClick={() => redo()}>
        <ToolbarIcon file="Redo.svg" alt="" className="h-4 w-4" />
      </ToolButton>

      <Divider />

      <ToolButton
        label="Decrease font size"
        onClick={() => applyFontSize(stepFontSize(stepperBase, -1))}
      >
        <ToolbarIcon file="Minus.svg" alt="" className="h-3 w-3" />
      </ToolButton>
      <div className="relative mx-0.5 h-[21px] w-9">
        <ToolbarIcon
          file="Font Size Box.svg"
          alt=""
          className="absolute inset-0 h-full w-full"
        />
        <input
          type="text"
          inputMode="decimal"
          aria-label="Font size"
          value={fontSizeDisplay}
          onMouseDown={() => {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              savedRangeRef.current = selection.getRangeAt(0).cloneRange();
            }
          }}
          onChange={(e) => setFontSizeDisplay(e.target.value)}
          onBlur={() => {
            if (fontSizeDisplay.trim() === "") return;
            const parsed = Number(fontSizeDisplay);
            if (Number.isFinite(parsed)) applyFontSize(parsed);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          className="relative h-full w-full bg-transparent text-center text-[11px] tabular-nums outline-none"
        />
      </div>
      <ToolButton
        label="Increase font size"
        onClick={() => applyFontSize(stepFontSize(stepperBase, 1))}
      >
        <ToolbarIcon file="Plus.svg" alt="" className="h-3.5 w-3.5" />
      </ToolButton>

      <Divider />

      <ToolButton label="Bold" pressed={bold} onClick={() => runCommand("bold")}>
        <ToolbarIcon file="Bold.svg" alt="" className="h-4 w-3" />
      </ToolButton>
      <ToolButton label="Italic" pressed={italic} onClick={() => runCommand("italic")}>
        <ToolbarIcon file="Italic.svg" alt="" className="h-4 w-3" />
      </ToolButton>
      <ToolButton label="Underline" pressed={underline} onClick={() => runCommand("underline")}>
        <ToolbarIcon file="Underline.svg" alt="" className="h-[18px] w-4" />
      </ToolButton>

      <ColorMenuButton
        label="Font colour"
        icon={<ToolbarIcon file="Font Color.svg" alt="" className="h-3.5 w-3" />}
        color={fontColor}
        swatches={FONT_SWATCHES}
        open={showFontPicker}
        onOpenChange={(next) => {
          setShowFontPicker(next);
          if (next) setShowHighlightPicker(false);
        }}
        onApply={applyFontColor}
      />

      <ColorMenuButton
        label="Highlight"
        icon={<ToolbarIcon file="Highlighter.svg" alt="" className="h-3.5 w-4" />}
        color={highlightColor}
        swatches={HIGHLIGHT_SWATCHES}
        open={showHighlightPicker}
        onOpenChange={(next) => {
          setShowHighlightPicker(next);
          if (next) setShowFontPicker(false);
        }}
        onApply={applyHighlight}
      />

      <div className="relative overflow-visible">
        <ToolButton
          label="Annotate"
          pressed={annotationMode}
          disabled={inactive}
          onClick={() => {
            const next = !annotationMode;
            setAnnotationMode(next);
            if (next) {
              setShowFontPicker(false);
              setShowHighlightPicker(false);
            }
          }}
        >
          <ToolbarIcon file="Pen.svg" alt="" className="h-4 w-4" />
        </ToolButton>
        {annotationMode && (
          <div className="absolute top-9 left-0 z-50 flex items-center gap-1.5 border border-grey-light bg-white p-2 shadow-sm">
            {INK_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                title={swatch}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setAnnotationColor(swatch)}
                style={{ backgroundColor: swatch }}
                className={`h-5 w-5 border ${
                  annotationColor.toLowerCase() === swatch.toLowerCase()
                    ? "border-black"
                    : "border-grey-light"
                }`}
              />
            ))}
            <input
              type="color"
              aria-label="Custom ink colour"
              value={toHexColor(annotationColor)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setAnnotationColor(e.target.value)}
              className="h-5 w-6 cursor-pointer border-0 p-0"
            />
            <div className="ml-1 flex items-center gap-1 text-xs text-grey">
              <button
                type="button"
                aria-label="Thinner stroke"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setAnnotationStrokeWidth(clamp(annotationStrokeWidth - 1, 1, 12))}
                className="flex h-5 w-5 items-center justify-center border border-grey-light leading-none"
              >
                −
              </button>
              <span className="w-3 text-center text-foreground">{annotationStrokeWidth}</span>
              <button
                type="button"
                aria-label="Thicker stroke"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setAnnotationStrokeWidth(clamp(annotationStrokeWidth + 1, 1, 12))}
                className="flex h-5 w-5 items-center justify-center border border-grey-light leading-none"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function toHexColor(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const r = color[1];
    const g = color[2];
    const b = color[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#171717";
}

function ColorMenuButton({
  label,
  icon,
  color,
  swatches,
  open,
  onOpenChange,
  onApply,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  swatches: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (color: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const hex = toHexColor(color);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      onOpenChangeRef.current(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChangeRef.current(false);
    }

    // Defer so the same click that opens the menu cannot also be treated as
    // an outside click (mousedown on the trigger is outside the popover node).
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function pickSwatch(next: string) {
    onApply(next);
    // Close after this click, not during it — unmounting the popover in the
    // click handler can retarget the event onto the trigger and toggle it open.
    window.setTimeout(() => onOpenChangeRef.current(false), 0);
  }

  return (
    <div ref={rootRef} className="relative overflow-visible">
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onOpenChange(!open)}
        className="flex h-8 w-8 flex-col items-center justify-center gap-0.5 rounded-sm hover:bg-zinc-100"
      >
        {icon}
        <span className="flex w-full items-center justify-center py-0.5">
          <ColorBar color={color} />
        </span>
      </button>
      {open && (
        <div className="absolute top-9 left-0 z-50 flex gap-1 border border-grey-light bg-white p-2 shadow-sm">
          {swatches.map((swatch) => (
            <button
              key={swatch}
              type="button"
              title={swatch}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickSwatch(swatch)}
              style={{ backgroundColor: swatch }}
              className={`h-5 w-5 border ${hex.toLowerCase() === swatch.toLowerCase() ? "border-black" : "border-grey-light"}`}
            />
          ))}
          <input
            type="color"
            aria-label={`Custom ${label.toLowerCase()}`}
            value={hex}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onApply(e.target.value)}
            className="h-5 w-6 cursor-pointer border-0 p-0"
          />
        </div>
      )}
    </div>
  );
}
