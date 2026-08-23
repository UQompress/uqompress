"use client";

export const SHARK_THINK_SRC = "/shark/shark-think.gif";

export function isAbortError(err: unknown) {
  return err instanceof DOMException
    ? err.name === "AbortError"
    : err instanceof Error && err.name === "AbortError";
}

export function AnalysingModal({ onCancel }: { onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analysing-title"
    >
      <div className="flex w-full max-w-sm flex-col items-center rounded-3xl bg-white px-10 py-8 shadow-lg">
        <h2
          id="analysing-title"
          className="text-center text-xl font-bold text-uq-purple"
        >
          Sharky is analysing...
        </h2>

        <div
          className="mt-6 size-20 animate-spin rounded-full"
          style={{
            background: "conic-gradient(#e879a9, #51247a, #e879a9)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 7px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 7px))",
          }}
          aria-hidden
        />

        <img
          src={SHARK_THINK_SRC}
          alt="Sharky thinking"
          width={180}
          height={180}
          className="mt-5 h-40 w-40 object-contain"
        />

        <button
          type="button"
          onClick={onCancel}
          className="mt-5 border border-grey-light px-4 py-1.5 text-xs text-grey hover:border-uq-purple hover:text-uq-purple"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
