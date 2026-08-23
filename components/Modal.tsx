"use client";

import { X } from "lucide-react";

const SIZE_CLASSES = {
  md: "max-w-md",
  lg: "max-w-2xl",
};

export function Modal({
  title,
  onClose,
  children,
  size = "md",
  aside,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "md" | "lg";
  aside?: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative flex max-h-[85vh] w-full ${SIZE_CLASSES[size]} flex-col gap-4 overflow-visible bg-white p-6 ${aside ? "md:mr-40" : ""}`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-grey hover:text-foreground"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
        {aside ? (
          <div className="pointer-events-none absolute bottom-2 left-[calc(100%+0.75rem)] hidden md:block">
            {aside}
          </div>
        ) : null}
      </div>
    </div>
  );
}
