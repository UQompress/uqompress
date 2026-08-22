import type { BlockType, CanvasBlock, Orientation } from "./types";

export const GRID = 8;

// Alignment snap threshold (px) against other blocks' edges/centers.
export const ALIGN_SNAP_THRESHOLD = 6;

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
  bullet: "",
};

// A4 proportions (210:297) scaled down to fit comfortably on screen.
const PORTRAIT_WIDTH = 600;
const PORTRAIT_HEIGHT = 849;

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
