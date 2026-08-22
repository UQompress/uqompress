import type { BlockType, CanvasBlock, Orientation, TextBlockKind } from "./types";

export const GRID = 8;

// Alignment snap threshold (px) against other blocks' edges/centers.
export const ALIGN_SNAP_THRESHOLD = 6;

// Print point sizes. The A4 canvas is sized in CSS px so that 1px = 1pt,
// which keeps on-screen sizes identical to the exported PDF.
export const FONT_SIZE_SCALE = [5, 5.5, 6, 6.5, 7, 8, 9, 10, 11, 12, 14, 16, 18, 24];
export const DEFAULT_FONT_SIZE = 12;
export const MIN_FONT_SIZE = 4;
export const MAX_FONT_SIZE = 72;
export const TEXT_LINE_HEIGHT = 1.15;

export const TEXT_KIND_DEFAULTS: Record<
  TextBlockKind,
  {
    fontSize: number;
    fontWeight: number;
    color: string;
    background: string;
    textTransform: "uppercase" | "none";
    padding: string;
    indent: number;
  }
> = {
  topic: {
    fontSize: 13,
    fontWeight: 700,
    color: "#ffffff",
    background: "#51247a",
    textTransform: "uppercase",
    padding: "2px 4px",
    indent: 0,
  },
  subtopic: {
    fontSize: 13,
    fontWeight: 700,
    color: "#171717",
    background: "transparent",
    textTransform: "uppercase",
    padding: "0px 4px",
    indent: 0,
  },
  body: {
    fontSize: 12,
    fontWeight: 400,
    color: "#171717",
    background: "transparent",
    textTransform: "none",
    padding: "0px 4px",
    indent: 0,
  },
  subbody: {
    fontSize: 11.5,
    fontWeight: 400,
    color: "#171717",
    background: "transparent",
    textTransform: "none",
    padding: "0px 4px",
    indent: 8,
  },
};

export const TEXT_KIND_LABELS: Record<TextBlockKind, string> = {
  topic: "Topic",
  subtopic: "Subtopic",
  body: "Body",
  subbody: "Sub body",
};

const GRID_WIDTH_TYPES: BlockType[] = ["text", "table", "image", "divider"];

export const DEFAULT_CONTENT: Record<BlockType, string> = {
  text: "",
  table: "Header 1 | Header 2\nRow 1 | Row 2",
  image: "",
  divider: "",
  line: "",
  arrow: "",
  tick: "",
  circle: "",
  cross: "",
};

// A4 in PostScript points (1pt = 1/72in). Rendering the page at this CSS
// pixel size means font-size: Npx is Npt in the exported PDF.
const PORTRAIT_WIDTH = 595;
const PORTRAIT_HEIGHT = 842;

export function getPageDimensions(orientation: Orientation): {
  width: number;
  height: number;
} {
  return orientation === "landscape"
    ? { width: PORTRAIT_HEIGHT, height: PORTRAIT_WIDTH }
    : { width: PORTRAIT_WIDTH, height: PORTRAIT_HEIGHT };
}

export function snap(value: number): number {
  return Math.round(value / GRID) * GRID;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function fitsGridCellWidth(type: BlockType): boolean {
  return GRID_WIDTH_TYPES.includes(type);
}

export function getGridCellIndexes(
  x: number,
  y: number,
  pageWidth: number,
  pageHeight: number,
  rows: number,
  cols: number,
): { row: number; col: number } {
  const safeRows = Math.max(1, rows);
  const safeCols = Math.max(1, cols);
  const cellWidth = pageWidth / safeCols;
  const cellHeight = pageHeight / safeRows;
  return {
    col: Math.min(safeCols - 1, Math.floor(clamp(x, 0, pageWidth - 1) / cellWidth)),
    row: Math.min(safeRows - 1, Math.floor(clamp(y, 0, pageHeight - 1) / cellHeight)),
  };
}

// Treats the visible row/column lines as real cell boundaries. Content blocks
// fill the column they occupy, while free-form design elements keep their
// width. Every block keeps its height and is contained by its current row
// whenever that height fits inside the row.
export function fitBlockToGridCell({
  type,
  x,
  y,
  width,
  height,
  pageWidth,
  pageHeight,
  rows,
  cols,
}: {
  type: BlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
  rows: number;
  cols: number;
}): { x: number; y: number; width: number } {
  const safeRows = Math.max(1, rows);
  const safeCols = Math.max(1, cols);
  const cellWidth = pageWidth / safeCols;
  const cellHeight = pageHeight / safeRows;
  const { row, col } = getGridCellIndexes(
    x,
    y,
    pageWidth,
    pageHeight,
    safeRows,
    safeCols,
  );
  const cellLeft = col * cellWidth;
  const cellRight = (col + 1) * cellWidth;
  const cellTop = row * cellHeight;
  const cellBottom = (row + 1) * cellHeight;
  const nextWidth = fitsGridCellWidth(type) ? cellWidth : Math.min(width, cellWidth);
  const nextX = fitsGridCellWidth(type)
    ? cellLeft
    : clamp(x, cellLeft, Math.max(cellLeft, cellRight - nextWidth));
  const nextY =
    height <= cellHeight
      ? clamp(y, cellTop, cellBottom - height)
      : cellTop;

  return { x: nextX, y: nextY, width: nextWidth };
}

export function defaultTextBlockHeight(kind: TextBlockKind): number {
  return kind === "topic" || kind === "subtopic" ? 24 : 40;
}

export function stepFontSize(current: number, direction: 1 | -1): number {
  if (direction === 1) {
    const next = FONT_SIZE_SCALE.find((size) => size > current + 0.001);
    return next ?? Math.min(MAX_FONT_SIZE, current);
  }
  const prev = [...FONT_SIZE_SCALE].reverse().find((size) => size < current - 0.001);
  return prev ?? Math.max(MIN_FONT_SIZE, current);
}

export function clampFontSize(value: number): number {
  return clamp(value, MIN_FONT_SIZE, MAX_FONT_SIZE);
}

// Content dragged in from the AI Suggestion Bar is often much longer than a
// blank "Text" block's default size — sizing it off the fixed DEFAULT_SIZE
// clipped the content. Rough estimate at 12pt body / ~28 chars per column.
export function estimateTextBlockSize(content: string): { width: number; height: number } {
  const CHARS_PER_LINE = 28;
  const LINE_HEIGHT = DEFAULT_FONT_SIZE * TEXT_LINE_HEIGHT;
  const WIDTH = 260;
  const estimatedLines = Math.max(1, Math.ceil(content.length / CHARS_PER_LINE));
  const height = clamp(estimatedLines * LINE_HEIGHT + 8, 16, 400);
  return { width: WIDTH, height };
}

// Snaps a moving block's edges/center to the nearest matching edge/center of
// any other block on the canvas, within ALIGN_SNAP_THRESHOLD px — like
// Figma/PowerPoint alignment guides, so boxes can line up with each other
// instead of only the fixed pixel grid.
export function alignToOtherBlocks(
  x: number,
  y: number,
  width: number,
  height: number,
  blocks: CanvasBlock[],
  movingId: string,
): { x: number; y: number } {
  let bestX = x;
  let bestY = y;
  let bestXDist = ALIGN_SNAP_THRESHOLD;
  let bestYDist = ALIGN_SNAP_THRESHOLD;

  const movingEdgesX = [
    { edge: x, offset: 0 },
    { edge: x + width / 2, offset: width / 2 },
    { edge: x + width, offset: width },
  ];
  const movingEdgesY = [
    { edge: y, offset: 0 },
    { edge: y + height / 2, offset: height / 2 },
    { edge: y + height, offset: height },
  ];

  for (const other of blocks) {
    if (other.id === movingId) continue;
    const otherXLines = [other.x, other.x + other.width / 2, other.x + other.width];
    const otherYLines = [other.y, other.y + other.height / 2, other.y + other.height];

    for (const line of otherXLines) {
      for (const me of movingEdgesX) {
        const dist = Math.abs(me.edge - line);
        if (dist < bestXDist) {
          bestXDist = dist;
          bestX = line - me.offset;
        }
      }
    }
    for (const line of otherYLines) {
      for (const me of movingEdgesY) {
        const dist = Math.abs(me.edge - line);
        if (dist < bestYDist) {
          bestYDist = dist;
          bestY = line - me.offset;
        }
      }
    }
  }

  return { x: bestX, y: bestY };
}
