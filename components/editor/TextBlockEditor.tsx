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

export function TextBlockEditor({
  block,
  onChange,
}: {
  block: CanvasBlock;
  onChange: (patch: Partial<CanvasBlock>, opts?: { coalesceKey?: string }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(block.content);
  const seeded = useRef(false);
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
    if (shouldAutoLabel) {
      const next = applyLabelBeforeColon(htmlToPlainText(el.innerHTML));
      el.innerHTML = next;
      emit(next);
    } else {
      emit(sanitizeBlockHtml(el.innerHTML), { manualLabelFormat: true });
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
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onInput={handleInput}
      onPaste={handlePaste}
      onPointerDown={(e) => e.stopPropagation()}
      className="text-block-editor h-full w-full overflow-hidden whitespace-pre-wrap outline-none"
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
