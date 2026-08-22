"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Modal } from "@/components/Modal";
import { getSampleCheatsheets } from "@/lib/sample-cheatsheets";

export function ViewSampleModal({
  courseCode,
  onClose,
}: {
  courseCode: string;
  onClose: () => void;
}) {
  const samples = getSampleCheatsheets(courseCode);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (samples.length === 0) {
    return (
      <Modal title="Sample cheat sheet" onClose={onClose}>
        <p className="text-sm text-grey">
          No sample available yet for {courseCode || "this course"}.
        </p>
      </Modal>
    );
  }

  const selected = samples.find((s) => s.id === selectedId) ?? null;

  if (!selected) {
    return (
      <Modal title="Sample cheat sheets" onClose={onClose}>
        <div className="flex flex-col gap-2">
          <p className="mb-1 text-sm text-grey">
            Real student-submitted cheat sheets for {courseCode}.
          </p>
          {samples.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => setSelectedId(sample.id)}
              className="flex flex-col items-start border border-grey-light px-3 py-2 text-left text-sm hover:border-uq-purple"
            >
              <span className="font-medium">{sample.title}</span>
              <span className="text-xs text-grey">{sample.sourceNote}</span>
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={selected.title} onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-1 text-xs text-grey hover:text-foreground"
        >
          <ArrowLeft size={12} strokeWidth={1.5} />
          All samples
        </button>

        {/* Tries to render the real PDF; if it's not present under /public
            yet, the browser falls through to the text-based fallback below. */}
        <object data={selected.pdfPath} type="application/pdf" className="h-[65vh] w-full border border-grey-light">
          <div className="flex flex-col gap-4 p-2">
            <p className="text-xs text-grey">
              The real PDF isn&apos;t available yet — showing the condensed text version
              instead.
            </p>
            {selected.sections.map((section) => (
              <div key={section.heading} className="flex flex-col gap-1">
                <h3 className="text-xs uppercase tracking-wide text-grey">{section.heading}</h3>
                <p className="whitespace-pre-wrap text-sm">{section.content}</p>
              </div>
            ))}
          </div>
        </object>
      </div>
    </Modal>
  );
}
