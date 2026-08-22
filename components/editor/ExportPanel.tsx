"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { PageThumbnail } from "@/components/editor/PageThumbnail";
import { useStudioStore } from "@/lib/store";

export function ExportPanel({
  onClose,
  onExport,
  isExporting,
}: {
  onClose: () => void;
  onExport: (pageIndexes: number[]) => Promise<void>;
  isExporting: boolean;
}) {
  const pageCount = useStudioStore((s) => s.pageCount);
  const [checked, setChecked] = useState<boolean[]>(() =>
    Array.from({ length: pageCount }, () => true),
  );

  const selectedIndexes = useMemo(
    () => checked.flatMap((isOn, index) => (isOn ? [index] : [])),
    [checked],
  );
  const allSelected = checked.length > 0 && checked.every(Boolean);

  function toggleAll() {
    const next = !allSelected;
    setChecked(Array.from({ length: pageCount }, () => next));
  }

  return (
    <Modal title="Export to PDF" onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-grey">Choose pages to include. Page size is A4.</p>
          <button type="button" onClick={toggleAll} className="text-sm text-uq-purple hover:underline">
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
        <ul className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
          {Array.from({ length: pageCount }, (_, index) => (
            <li key={index} className="flex items-center gap-3 border border-grey-light px-3 py-2">
              <input
                type="checkbox"
                checked={checked[index] ?? false}
                onChange={() =>
                  setChecked((current) => current.map((value, i) => (i === index ? !value : value)))
                }
                aria-label={`Include page ${index + 1}`}
              />
              <PageThumbnail pageIndex={index} width={56} dimmed={!checked[index]} />
              <span className="text-sm">Page {index + 1}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <button
            type="button"
            disabled={isExporting || selectedIndexes.length === 0}
            onClick={() => onExport(selectedIndexes)}
            className="bg-uq-purple px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
