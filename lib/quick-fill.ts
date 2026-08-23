import {
  clamp,
  getPageDimensions,
  MIN_FONT_SIZE,
  TEXT_KIND_DEFAULTS,
  TEXT_LINE_HEIGHT,
} from "./editor-constants";
import { plainTextToBlockHtml } from "./rich-text";
import type {
  CanvasBlock,
  GeneratedContent,
  Orientation,
  TextBlockKind,
  Topic,
} from "./types";

type QuickFillOptions = {
  topics: Topic[];
  generatedContent: Record<string, GeneratedContent>;
  orientation: Orientation;
  gridRows: number;
  gridCols: number;
};

type QuickFillFonts = Record<"topic" | "subtopic" | "body", number>;

export type QuickFillLayout = {
  blocks: CanvasBlock[];
  pageCount: number;
  topicCount: number;
  questionTypeCount: number;
  contentItemCount: number;
};

const CELL_PADDING = 4;
const BLOCK_GAP = 3;
const BLOCK_BORDER_WIDTH = 1;
const TEXT_HORIZONTAL_PADDING = 4;
const WRAP_WIDTH_SAFETY = 2;
const MAX_AUTO_FIT_PAGES = 2;
const AUTO_FIT_FONT_STEP = 0.5;
// html2canvas rasterizes text baselines slightly lower than Chromium paints
// them on screen. Reserve a small bottom allowance so the final glyph row
// never meets the next block's border in an exported PDF.
const TEXT_RENDERING_SAFETY = 4;

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function fontSizesForCell(cellWidth: number): QuickFillFonts {
  const body = roundToHalf(clamp(cellWidth / 22, 5, TEXT_KIND_DEFAULTS.body.fontSize));
  return {
    topic: roundToHalf(clamp(body + 2, 7, TEXT_KIND_DEFAULTS.topic.fontSize)),
    subtopic: roundToHalf(clamp(body + 1, 6, TEXT_KIND_DEFAULTS.subtopic.fontSize)),
    body,
  };
}

function smallerFontSizes(fonts: QuickFillFonts): QuickFillFonts {
  return {
    topic: roundToHalf(Math.max(MIN_FONT_SIZE + 2, fonts.topic - AUTO_FIT_FONT_STEP)),
    subtopic: roundToHalf(Math.max(MIN_FONT_SIZE + 1, fonts.subtopic - AUTO_FIT_FONT_STEP)),
    body: roundToHalf(Math.max(MIN_FONT_SIZE, fonts.body - AUTO_FIT_FONT_STEP)),
  };
}

// Wrap with the same font metrics used by the rendered blocks. Measuring every
// line at the bold weight is intentionally conservative for body blocks, where
// only the label before the colon is bold. That keeps browser wrapping from
// adding an unexpected line after the layout has assigned the block's height.
function wrapText(
  value: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] {
  const lines: string[] = [];
  for (const rawLine of value.replace(/\r/g, "").split("\n")) {
    const words = rawLine.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let current = "";
    for (const originalWord of words) {
      let word = originalWord;
      while (measure(word) > maxWidth) {
        if (current) {
          lines.push(current);
          current = "";
        }
        let splitAt = 1;
        while (splitAt < word.length && measure(word.slice(0, splitAt + 1)) <= maxWidth) {
          splitAt += 1;
        }
        lines.push(word.slice(0, splitAt));
        word = word.slice(splitAt);
      }
      if (!word) continue;
      if (!current) {
        current = word;
      } else if (measure(`${current} ${word}`) <= maxWidth) {
        current += ` ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines.length > 0 ? lines : [""];
}

function bodyItems(content: GeneratedContent): string[] {
  return [
    ...content.theory.map((item) => `Key theory: ${item}`),
    ...content.sampleExamples.map((item) => `Example: ${item}`),
    ...content.commonErrors.map((item) => `Common error: ${item}`),
  ].filter((item) => item.trim().length > 0);
}

function buildQuickFillLayoutAtSize({
  topics,
  generatedContent,
  orientation,
  gridRows,
  gridCols,
  fonts,
  idSeed,
}: QuickFillOptions & { fonts: QuickFillFonts; idSeed: number }): QuickFillLayout {
  const rows = Math.max(1, Math.floor(gridRows));
  const cols = Math.max(1, Math.floor(gridCols));
  const cellsPerPage = rows * cols;
  const page = getPageDimensions(orientation);
  const cellWidth = page.width / cols;
  const cellHeight = page.height / rows;
  const innerWidth = Math.max(1, cellWidth - CELL_PADDING * 2);
  const innerHeight = Math.max(1, cellHeight - CELL_PADDING * 2);
  const measurementContext =
    typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  const fontFamily =
    typeof window === "undefined"
      ? "Arial, sans-serif"
      : window.getComputedStyle(document.body).fontFamily || "Arial, sans-serif";
  const blocks: CanvasBlock[] = [];
  let idCounter = 0;
  let cellOrdinal = 0;
  let cursorY = CELL_PADDING;
  let cellHasContent = false;
  let topicCount = 0;
  let questionTypeCount = 0;
  let contentItemCount = 0;

  function cellPosition() {
    const cellOnPage = cellOrdinal % cellsPerPage;
    const row = Math.floor(cellOnPage / cols);
    const col = cellOnPage % cols;
    return {
      pageIndex: Math.floor(cellOrdinal / cellsPerPage),
      x: col * cellWidth + CELL_PADDING,
      top: row * cellHeight + CELL_PADDING,
      bottom: (row + 1) * cellHeight - CELL_PADDING,
    };
  }

  function advanceCell() {
    cellOrdinal += 1;
    cursorY = cellPosition().top;
    cellHasContent = false;
  }

  function availableHeight(): number {
    const gap = cellHasContent ? BLOCK_GAP : 0;
    return cellPosition().bottom - cursorY - gap;
  }

  function wrappedLines(kind: "topic" | "subtopic" | "body", value: string): string[] {
    const fontSize = fonts[kind];
    const defaults = TEXT_KIND_DEFAULTS[kind];
    const textWidth = Math.max(
      1,
      innerWidth -
        BLOCK_BORDER_WIDTH * 2 -
        TEXT_HORIZONTAL_PADDING * 2 -
        WRAP_WIDTH_SAFETY,
    );
    const measure = (text: string) => {
      const renderedText = defaults.textTransform === "uppercase" ? text.toUpperCase() : text;
      if (!measurementContext) return renderedText.length * fontSize * 0.6;
      measurementContext.font = `700 ${fontSize}px ${fontFamily}`;
      return measurementContext.measureText(renderedText).width;
    };
    return wrapText(value, textWidth, measure);
  }

  function boxChrome(kind: "topic" | "subtopic" | "body"): number {
    const verticalPadding = kind === "topic" ? 4 : 0;
    return verticalPadding + BLOCK_BORDER_WIDTH * 2 + TEXT_RENDERING_SAFETY;
  }

  function requiredTextHeight(kind: "topic" | "subtopic" | "body", value: string): number {
    return Math.ceil(wrappedLines(kind, value).length * fonts[kind] * TEXT_LINE_HEIGHT + boxChrome(kind));
  }

  function minimumHeight(kind: "topic" | "subtopic" | "body"): number {
    return Math.ceil(fonts[kind] * TEXT_LINE_HEIGHT + boxChrome(kind));
  }

  function ensureGroupStartHeight(required: number) {
    if (cellHasContent && availableHeight() < Math.min(required, innerHeight)) {
      advanceCell();
    }
  }

  function placeText(kind: "topic" | "subtopic" | "body", value: string) {
    const fontSize = fonts[kind];
    const pendingLines = wrappedLines(kind, value);
    const chrome = boxChrome(kind);

    while (pendingLines.length > 0) {
      if (availableHeight() < minimumHeight(kind)) advanceCell();

      const lineHeight = fontSize * TEXT_LINE_HEIGHT;
      const linesThatFit = Math.max(
        1,
        Math.floor((availableHeight() - chrome) / lineHeight),
      );
      const segmentLines = pendingLines.splice(0, linesThatFit);
      const segment = segmentLines.join("\n");
      const height = Math.min(
        availableHeight(),
        Math.ceil(segmentLines.length * lineHeight + chrome),
      );
      const position = cellPosition();
      if (cellHasContent) cursorY += BLOCK_GAP;

      idCounter += 1;
      blocks.push({
        id: `quick-fill-${idSeed}-${idCounter}`,
        type: "text",
        pageIndex: position.pageIndex,
        x: position.x,
        y: cursorY,
        width: innerWidth,
        height,
        content:
          kind === "body"
            ? segmentLines
                .map((line) => plainTextToBlockHtml(line, kind as TextBlockKind))
                .join("<br>")
            : plainTextToBlockHtml(segment, kind as TextBlockKind),
        fontSize,
        textKind: kind,
      });
      cursorY += height;
      cellHasContent = true;

      if (pendingLines.length > 0) advanceCell();
    }
  }

  const rankedTopics = topics
    .map((topic, index) => ({ topic, index }))
    .sort(
      (a, b) =>
        b.topic.frequencyScore - a.topic.frequencyScore || a.index - b.index,
    );

  for (const { topic } of rankedTopics) {
    const generatedQuestionTypes = topic.questionTypes
      .map((questionType, index) => ({
        questionType,
        index,
        content: generatedContent[questionType.id],
      }))
      .filter(({ content }) => content && bodyItems(content).length > 0)
      .sort(
        (a, b) =>
          b.questionType.questionCount - a.questionType.questionCount || a.index - b.index,
      );

    if (generatedQuestionTypes.length === 0) continue;
    topicCount += 1;
    ensureGroupStartHeight(
      minimumHeight("topic") + minimumHeight("subtopic") + minimumHeight("body") + BLOCK_GAP * 2,
    );
    placeText("topic", topic.name);

    for (const { questionType, content } of generatedQuestionTypes) {
      const items = bodyItems(content);
      const sectionBody = items.join("\n");
      questionTypeCount += 1;
      contentItemCount += items.length;
      ensureGroupStartHeight(
        requiredTextHeight("subtopic", questionType.name) +
          requiredTextHeight("body", sectionBody) +
          BLOCK_GAP,
      );
      placeText("subtopic", questionType.name);
      // A question type is one visual section: retain its purple heading, but
      // merge all theory, examples, and error cards into one bordered body box.
      // If the section cannot fit in the remaining grid cell, placeText splits
      // it only at the cell/page boundary rather than creating a box per card.
      placeText("body", sectionBody);
    }
  }

  const lastPageIndex = blocks.reduce(
    (maxPage, block) => Math.max(maxPage, block.pageIndex),
    0,
  );

  return {
    blocks,
    pageCount: blocks.length > 0 ? lastPageIndex + 1 : 1,
    topicCount,
    questionTypeCount,
    contentItemCount,
  };
}

export function buildQuickFillLayout(options: QuickFillOptions): QuickFillLayout {
  const cols = Math.max(1, Math.floor(options.gridCols));
  const page = getPageDimensions(options.orientation);
  let fonts = fontSizesForCell(page.width / cols);
  const idSeed = Date.now();
  let layout = buildQuickFillLayoutAtSize({ ...options, fonts, idSeed });

  // Keep the normal default comfortably readable. If dense generated content
  // spills beyond two pages, compact all three hierarchy levels together and
  // reflow from scratch until it fits or reaches the editor's readable floor.
  while (layout.pageCount > MAX_AUTO_FIT_PAGES) {
    const nextFonts = smallerFontSizes(fonts);
    if (
      nextFonts.topic === fonts.topic &&
      nextFonts.subtopic === fonts.subtopic &&
      nextFonts.body === fonts.body
    ) {
      break;
    }
    fonts = nextFonts;
    layout = buildQuickFillLayoutAtSize({ ...options, fonts, idSeed });
  }

  return layout;
}
