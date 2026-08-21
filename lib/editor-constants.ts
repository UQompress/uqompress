export const GRID = 8;

// A4 proportions (210:297) scaled down to fit comfortably on screen.
export const PAGE_WIDTH = 600;
export const PAGE_HEIGHT = 849;

export function snap(value: number): number {
  return Math.round(value / GRID) * GRID;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
