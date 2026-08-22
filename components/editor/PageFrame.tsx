"use client";

import { useDroppable } from "@dnd-kit/core";
import { getPageDimensions } from "@/lib/editor-constants";
import { useStudioStore } from "@/lib/store";

export function PageFrame({
  children,
  onBackgroundClick,
}: {
  children: React.ReactNode;
  onBackgroundClick: () => void;
}) {
  const { setNodeRef } = useDroppable({ id: "page-frame" });
  const orientation = useStudioStore((s) => s.orientation);
  const gridRows = useStudioStore((s) => s.gridRows);
  const gridCols = useStudioStore((s) => s.gridCols);
  const { width, height } = getPageDimensions(orientation);

  return (
    <div
      id="cheat-sheet-page"
      ref={setNodeRef}
      onClick={onBackgroundClick}
      style={{
        width,
        height,
        backgroundImage: "radial-gradient(circle, #e5e5e5 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
      className="relative shrink-0 border border-grey-light bg-white"
    >
      {(gridRows > 1 || gridCols > 1) && (
        <div className="pointer-events-none absolute inset-0" data-cheat-sheet-grid-guide>
          {Array.from({ length: gridCols - 1 }, (_, i) => (
            <div
              key={`col-${i}`}
              className="absolute top-0 bottom-0 border-l border-dashed border-grey-light"
              style={{ left: (width / gridCols) * (i + 1) }}
            />
          ))}
          {Array.from({ length: gridRows - 1 }, (_, i) => (
            <div
              key={`row-${i}`}
              className="absolute left-0 right-0 border-t border-dashed border-grey-light"
              style={{ top: (height / gridRows) * (i + 1) }}
            />
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
