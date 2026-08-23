"use client";

import { getPageDimensions } from "@/lib/editor-constants";
import { useStudioStore } from "@/lib/store";

export function PageThumbnail({
  pageIndex,
  selected,
  width = 72,
  onClick,
  dimmed,
}: {
  pageIndex: number;
  selected?: boolean;
  width?: number;
  onClick?: () => void;
  dimmed?: boolean;
}) {
  const orientation = useStudioStore((s) => s.orientation);
  const blocks = useStudioStore((s) => s.blocks);
  const { width: pageWidth, height: pageHeight } = getPageDimensions(orientation);
  const scale = width / pageWidth;
  const height = pageHeight * scale;
  const pageBlocks = blocks.filter((block) => block.pageIndex === pageIndex);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 ${dimmed ? "opacity-40" : ""}`}
    >
      <div
        className={`relative overflow-hidden bg-white ${
          selected ? "ring-2 ring-uq-purple" : "border border-grey-light"
        }`}
        style={{ width, height }}
      >
        {pageBlocks.map((block) => (
          <div
            key={block.id}
            className="absolute"
            style={{
              left: block.x * scale,
              top: block.y * scale,
              width: Math.max(1, block.width * scale),
              height: Math.max(1, block.height * scale),
              background:
                block.type === "ink"
                  ? (block.shapeColor ?? "#171717")
                  : block.type === "text" && block.textKind === "topic"
                    ? "#51247a"
                    : "#d4d4d4",
            }}
          />
        ))}
      </div>
      <span className="text-[10px] text-grey">Page {pageIndex + 1}</span>
    </button>
  );
}
