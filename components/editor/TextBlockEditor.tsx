"use client";

import { useLayoutEffect, useRef } from "react";
import { TEXT_KIND_DEFAULTS, TEXT_LINE_HEIGHT } from "@/lib/editor-constants";
import {
  applyLabelBeforeColon,
  getCaretCharacterOffset,
  htmlToPlainText,
  sanitizeBlockHtml,
  setCaretCharacterOffset,
} from "@/lib/rich-text";
import type { CanvasBlock, TextBlockKind } from "@/lib/types";

function placeCaretAtPoint(el: HTMLElement, x: number, y: number) {
  const selection = window.getSelection();
  if (!selection) return;
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (typeof doc.caretPositionFromPoint === "function") {
    const pos = doc.caretPositionFromPoint(x, y);
    if (!pos || !el.contains(pos.offsetNode)) return;
    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return;
  }
  const range = doc.caretRangeFromPoint?.(x, y);
  if (!range || !el.contains(range.startContainer)) return;
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function TextBlockEditor({
  block,
  isEditing,
  onChange,
}: {
  block: CanvasBlock;
  isEditing: boolean;
  onChange: (patch: Partial<CanvasBlock>, opts?: { coalesceKey?: string }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(block.content);
  const seeded = useRef(false);
  const pendingCaret = useRef<{ x: number; y: number } | null>(null);
  const kind: TextBlockKind = block.textKind ?? "body";
  const defaults = TEXT_KIND_DEFAULTS[kind];
  const fontSize = block.fontSize ?? defaults.fontSize;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!seeded.current) {
      el.innerHTML = block.content;
      lastEmitted.current = block.content;
      seeded.current = true;
      return;
    }
    if (block.content !== lastEmitted.current) {
      el.innerHTML = block.content;
      lastEmitted.current = block.content;
    }
  }, [block.content]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!isEditing) {
      if (document.activeElement === el) el.blur();
      return;
    }
    el.focus();
    const point = pendingCaret.current;
    pendingCaret.current = null;
    if (point) placeCaretAtPoint(el, point.x, point.y);
  }, [isEditing]);

  function emit(html: string, extra?: Partial<CanvasBlock>) {
    lastEmitted.current = html;
    onChange({ content: html, ...extra }, { coalesceKey: `content:${block.id}` });
  }

  function handleInput(e: React.FormEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const inputType = (e.nativeEvent as InputEvent).inputType ?? "";
    if (inputType.startsWith("format")) {
      emit(sanitizeBlockHtml(el.innerHTML), { manualLabelFormat: true });
      return;
    }

    const shouldAutoLabel =
      (kind === "body" || kind === "subbody") && !block.manualLabelFormat;
    if (shouldAutoLabel) {
      const caret = getCaretCharacterOffset(el);
      const next = applyLabelBeforeColon(el.innerText.replace(/\u00a0/g, " "));
      if (el.innerHTML !== next) {
        el.innerHTML = next;
        setCaretCharacterOffset(el, caret);
      }
      emit(next);
      return;
    }

    emit(sanitizeBlockHtml(el.innerHTML));
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    const cleaned = html ? sanitizeBlockHtml(html) : applyLabelBeforeColon(text);
    document.execCommand("insertHTML", false, cleaned);
    const el = ref.current;
    if (!el) return;
    const shouldAutoLabel =
      (kind === "body" || kind === "subbody") && !block.manualLabelFormat;
    if (!shouldAutoLabel) {
      emit(sanitizeBlockHtml(el.innerHTML), { manualLabelFormat: true });
    } else {
      const next = applyLabelBeforeColon(htmlToPlainText(el.innerHTML));
      el.innerHTML = next;
      emit(next);
    }
  }

  const isEmpty = !(block.content ?? "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/g, "")
    .trim();

  return (
    <div
      ref={ref}
      data-text-block-id={block.id}
      data-empty={isEmpty ? "true" : "false"}
      contentEditable={isEditing}
      suppressContentEditableWarning
      spellCheck={false}
      onInput={handleInput}
      onPaste={handlePaste}
      onPointerDown={(e) => {
        if (isEditing) {
          e.stopPropagation();
          return;
        }
        pendingCaret.current = { x: e.clientX, y: e.clientY };
      }}
      className={`text-block-editor h-full w-full overflow-hidden whitespace-pre-wrap outline-none ${
        isEditing ? "" : "select-none"
      }`}
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: TEXT_LINE_HEIGHT,
        fontWeight: defaults.fontWeight,
        color: block.textColor ?? defaults.color,
        background: defaults.background,
        textTransform: defaults.textTransform,
        padding: defaults.padding,
        ...(defaults.indent ? { paddingLeft: `${4 + defaults.indent}px` } : {}),
      }}
    />
  );
}
