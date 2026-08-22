import { escapeHtml } from "./html-safe-text";
import type { TextBlockKind } from "./types";

const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "SPAN", "BR", "MARK"]);

export function findLabelColonIndex(text: string): number {
  const masked = maskEquationRegions(text);
  for (let i = 0; i < masked.length; i++) {
    if (masked[i] !== ":") continue;
    const prev = i === 0 ? "" : masked[i - 1];
    if (prev >= "0" && prev <= "9") continue;
    return i;
  }
  return -1;
}

function maskEquationRegions(text: string): string {
  return text
    .replace(/\$[\s\S]*?\$/g, (match) => " ".repeat(match.length))
    .replace(/\\\([\s\S]*?\\\)/g, (match) => " ".repeat(match.length))
    .replace(/\\\[[\s\S]*?\\\]/g, (match) => " ".repeat(match.length));
}

export function applyLabelBeforeColon(plainText: string): string {
  const colon = findLabelColonIndex(plainText);
  if (colon < 0) return escapeWithBreaks(plainText);
  const label = plainText.slice(0, colon + 1);
  const rest = plainText.slice(colon + 1);
  return `<b>${escapeWithBreaks(label)}</b>${escapeWithBreaks(rest)}`;
}

export function plainTextToBlockHtml(plain: string, kind: TextBlockKind = "body"): string {
  if (kind === "body" || kind === "subbody") {
    return applyLabelBeforeColon(plain);
  }
  return escapeWithBreaks(plain);
}

export function htmlToPlainText(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
  }
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return holder.innerText;
}

function escapeWithBreaks(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

export function sanitizeBlockHtml(html: string): string {
  if (typeof document === "undefined") return escapeHtml(html);
  const template = document.createElement("template");
  template.innerHTML = html;
  cleanNode(template.content);
  return template.innerHTML;
}

function cleanNode(root: Node): void {
  const children = Array.from(root.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.parentNode?.removeChild(child);
      continue;
    }
    const el = child as HTMLElement;
    const tag = el.tagName;

    if (tag === "DIV" || tag === "P") {
      cleanNode(el);
      const br = document.createElement("br");
      el.parentNode?.insertBefore(br, el);
      unwrapElement(el);
      continue;
    }

    if (tag === "FONT") {
      const span = document.createElement("span");
      const color = el.getAttribute("color") || el.style.color;
      if (color) span.style.color = color;
      while (el.firstChild) span.appendChild(el.firstChild);
      el.replaceWith(span);
      cleanNode(span);
      continue;
    }

    cleanNode(el);

    if (tag === "STRONG") {
      renameElement(el, "b");
      continue;
    }
    if (tag === "EM") {
      renameElement(el, "i");
      continue;
    }
    if (tag === "MARK") {
      const span = document.createElement("span");
      const bg = el.style.backgroundColor || "#FEF9C3";
      span.style.backgroundColor = bg;
      while (el.firstChild) span.appendChild(el.firstChild);
      el.replaceWith(span);
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      unwrapElement(el);
      continue;
    }

    if (tag === "SPAN") {
      const color = el.style.color;
      const backgroundColor = el.style.backgroundColor;
      const fontSize = el.style.fontSize;
      for (const attr of Array.from(el.attributes)) {
        el.removeAttribute(attr.name);
      }
      if (color) el.style.color = color;
      if (backgroundColor) el.style.backgroundColor = backgroundColor;
      if (fontSize) el.style.fontSize = fontSize;
      continue;
    }

    for (const attr of Array.from(el.attributes)) {
      el.removeAttribute(attr.name);
    }
  }
}

function unwrapElement(el: HTMLElement): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function renameElement(el: HTMLElement, tagName: string): void {
  const next = document.createElement(tagName);
  while (el.firstChild) next.appendChild(el.firstChild);
  el.replaceWith(next);
}

export function getCaretCharacterOffset(el: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;
  const range = selection.getRangeAt(0);
  if (!el.contains(range.endContainer)) return (el.textContent ?? "").length;
  const pre = range.cloneRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.endContainer, range.endOffset);
  return pre.toString().length;
}

export function setCaretCharacterOffset(el: HTMLElement, offset: number): void {
  const selection = window.getSelection();
  if (!selection) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, offset);
  let node = walker.nextNode() as Text | null;
  while (node) {
    if (remaining <= node.length) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    remaining -= node.length;
    node = walker.nextNode() as Text | null;
  }
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function getSelectionFontSizesPx(): number[] {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return [];
  const range = selection.getRangeAt(0);
  const sizes = new Set<number>();

  function addFromElement(el: Element | null) {
    if (!el) return;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (!Number.isNaN(px)) sizes.add(Math.round(px * 2) / 2);
  }

  if (range.collapsed) {
    const el =
      range.startContainer instanceof Element
        ? range.startContainer
        : range.startContainer.parentElement;
    addFromElement(el);
    return [...sizes];
  }

  const root =
    range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  if (!root) return [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  let sawText = false;
  while (node) {
    if (node.textContent && range.intersectsNode(node)) {
      sawText = true;
      addFromElement(node.parentElement);
    }
    node = walker.nextNode();
  }
  if (!sawText) {
    const el =
      range.startContainer instanceof Element
        ? range.startContainer
        : range.startContainer.parentElement;
    addFromElement(el);
  }
  return [...sizes];
}

export function wrapSelectionInSpan(style: Partial<CSSStyleDeclaration>): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  const span = document.createElement("span");
  if (style.color) span.style.color = style.color;
  if (style.backgroundColor) span.style.backgroundColor = style.backgroundColor;
  if (style.fontSize) span.style.fontSize = style.fontSize;
  try {
    range.surroundContents(span);
  } catch {
    span.appendChild(range.extractContents());
    range.insertNode(span);
  }
  selection.removeAllRanges();
  const next = document.createRange();
  next.selectNodeContents(span);
  selection.addRange(next);
  return true;
}
