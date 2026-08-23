"use client";

import { useDroppable } from "@dnd-kit/core";
import { InkDrawLayer } from "@/components/editor/InkDrawLayer";
import { getPageDimensions } from "@/lib/editor-constants";
import { useStudioStore } from "@/lib/store";

export function PageFrame({
  index,
  children,
  onBackgroundClick,
  blank,
}: {
  index: number;
  children: React.ReactNode;
  onBackgroundClick: () => void;
  blank?: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: blank ? `compare-blank-${index}` : `page-frame-${index}`,
    disabled: Boolean(blank),
  });
  const orientation = useStudioStore((s) => s.orientation);
  const gridRows = useStudioStore((s) => s.gridRows);
  const gridCols = useStudioStore((s) => s.gridCols);
  const { width, height } = getPageDimensions(orientation);

  return (
    <div
      id={blank ? undefined : `cheat-sheet-page-${index}`}
      ref={setNodeRef}
      onClick={onBackgroundClick}
      style={{
        width,
        height,
      }}
      className="relative shrink-0 border border-grey-light bg-white"
    >
      {( !blank && (gridRows > 1 || gridCols > 1)) && (
        <div className="pointer-events-none absolute inset-0" data-cheat-sheet-grid-guide>
          {Array.from({ length: gridCols - 1 }, (_, i) => (
            <div
              key={`col-${i}`}
              className="absolute top-0 bottom-0 border-l"
              style={{ left: (width / gridCols) * (i + 1), borderColor: "#8a8a8a" }}
            />
          ))}
          {Array.from({ length: gridRows - 1 }, (_, i) => (
            <div
              key={`row-${i}`}
              className="absolute left-0 right-0 border-t"
              style={{ top: (height / gridRows) * (i + 1), borderColor: "#8a8a8a" }}
            />
          ))}
        </div>
      )}
      {blank ? null : children}
      {blank ? null : <InkDrawLayer pageIndex={index} />}
    </div>
  );
}
