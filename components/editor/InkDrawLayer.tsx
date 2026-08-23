"use client";

import { useRef, useState } from "react";
import { clamp, getPageDimensions } from "@/lib/editor-constants";
import {
  pagePointFromEvent,
  pointsToPath,
  serializeInk,
  strokeFromPagePoints,
  type InkPoint,
} from "@/lib/ink";
import { useStudioStore } from "@/lib/store";

const MIN_POINT_GAP = 0.8;

function appendPoint(points: InkPoint[], next: InkPoint): InkPoint[] {
  const last = points[points.length - 1];
  if (last) {
    const dx = next.x - last.x;
    const dy = next.y - last.y;
    if (dx * dx + dy * dy < MIN_POINT_GAP * MIN_POINT_GAP) return points;
  }
  return [...points, next];
}

export function InkDrawLayer({ pageIndex }: { pageIndex: number }) {
  const annotationMode = useStudioStore((s) => s.annotationMode);
  const color = useStudioStore((s) => s.annotationColor);
  const strokeWidth = useStudioStore((s) => s.annotationStrokeWidth);
  const orientation = useStudioStore((s) => s.orientation);
  const addBlockAt = useStudioStore((s) => s.addBlockAt);
  const { width: pageWidth, height: pageHeight } = getPageDimensions(orientation);

  const overlayRef = useRef<HTMLDivElement>(null);
  const pointsRef = useRef<InkPoint[]>([]);
  const drawingRef = useRef(false);
  const [livePoints, setLivePoints] = useState<InkPoint[]>([]);

  if (!annotationMode) return null;

  function toPagePoint(event: React.PointerEvent | PointerEvent): InkPoint | null {
    const el = overlayRef.current;
    if (!el) return null;
    const raw = pagePointFromEvent(event, el, pageWidth, pageHeight);
    return {
      x: clamp(raw.x, 0, pageWidth),
      y: clamp(raw.y, 0, pageHeight),
    };
  }

  function commitStroke() {
    const stroke = strokeFromPagePoints(pointsRef.current, strokeWidth);
    drawingRef.current = false;
    pointsRef.current = [];
    setLivePoints([]);
    if (!stroke) return;
    addBlockAt("ink", serializeInk(stroke.payload), stroke.x, stroke.y, {
      width: stroke.width,
      height: stroke.height,
    }, pageIndex, {
      shapeColor: color,
      strokeWidth,
    });
  }

  return (
    <div
      ref={overlayRef}
      data-ink-draw-layer=""
      className="absolute inset-0 z-20 touch-none"
      style={{ cursor: "crosshair" }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const point = toPagePoint(e);
        if (!point) return;
        drawingRef.current = true;
        pointsRef.current = [point];
        setLivePoints([point]);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drawingRef.current) return;
        const point = toPagePoint(e);
        if (!point) return;
        pointsRef.current = appendPoint(pointsRef.current, point);
        setLivePoints(pointsRef.current);
      }}
      onPointerUp={(e) => {
        if (!drawingRef.current) return;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        commitStroke();
      }}
      onPointerCancel={(e) => {
        if (!drawingRef.current) return;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        commitStroke();
      }}
    >
      {livePoints.length > 0 && (
        <svg
          viewBox={`0 0 ${pageWidth} ${pageHeight}`}
          className="pointer-events-none h-full w-full overflow-visible"
        >
          <path
            d={pointsToPath(livePoints)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}
