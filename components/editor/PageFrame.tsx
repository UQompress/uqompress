"use client";

import { useDroppable } from "@dnd-kit/core";
import { PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/editor-constants";

export function PageFrame({
  children,
  onBackgroundClick,
}: {
  children: React.ReactNode;
  onBackgroundClick: () => void;
}) {
  const { setNodeRef } = useDroppable({ id: "page-frame" });

  return (
    <div
      id="cheat-sheet-page"
      ref={setNodeRef}
      onClick={onBackgroundClick}
      style={{
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        backgroundImage:
          "radial-gradient(circle, #e5e5e5 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
      className="relative shrink-0 border border-grey-light bg-white"
    >
      {children}
    </div>
  );
}
