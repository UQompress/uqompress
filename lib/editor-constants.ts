import type { Orientation } from "./types";

export const GRID = 8;

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
