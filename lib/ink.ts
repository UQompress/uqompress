export type InkPoint = { x: number; y: number };

export type InkPayload = {
  d: string;
  vw: number;
  vh: number;
};

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function pointsToPath(points: InkPoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const { x, y } = points[0];
    return `M ${round(x)} ${round(y)} L ${round(x + 0.01)} ${round(y)}`;
  }
  let d = `M ${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${round(points[i].x)} ${round(points[i].y)}`;
  }
  return d;
}

export function strokeFromPagePoints(
  points: InkPoint[],
  strokeWidth: number,
): { payload: InkPayload; x: number; y: number; width: number; height: number } | null {
  if (points.length === 0) return null;
  const pad = Math.max(2, strokeWidth / 2 + 2);
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  const x = minX - pad;
  const y = minY - pad;
  const width = Math.max(1, maxX - minX + pad * 2);
  const height = Math.max(1, maxY - minY + pad * 2);
  const local = points.map((point) => ({ x: point.x - x, y: point.y - y }));
  return {
    payload: { d: pointsToPath(local), vw: round(width), vh: round(height) },
    x: round(x),
    y: round(y),
    width: round(width),
    height: round(height),
  };
}

export function serializeInk(payload: InkPayload): string {
  return JSON.stringify(payload);
}

export function parseInk(content: string): InkPayload | null {
  if (!content) return null;
  try {
    const value = JSON.parse(content) as Partial<InkPayload>;
    if (value && typeof value.d === "string") {
      return {
        d: value.d,
        vw: typeof value.vw === "number" && value.vw > 0 ? value.vw : 1,
        vh: typeof value.vh === "number" && value.vh > 0 ? value.vh : 1,
      };
    }
  } catch {
    if (/^[Mm]/.test(content)) return { d: content, vw: 1, vh: 1 };
  }
  return null;
}

export function pagePointFromEvent(
  event: Pick<PointerEvent, "clientX" | "clientY">,
  pageEl: HTMLElement,
  pageWidth: number,
  pageHeight: number,
): InkPoint {
  const rect = pageEl.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * pageWidth;
  const y = ((event.clientY - rect.top) / rect.height) * pageHeight;
  return { x, y };
}
