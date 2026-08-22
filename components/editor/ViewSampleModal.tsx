"use client";

import { Modal } from "@/components/Modal";
import { getSampleCheatsheet } from "@/lib/sample-cheatsheets";

export function ViewSampleModal({
  courseCode,
  onClose,
}: {
  courseCode: string;
  onClose: () => void;
}) {
  const sample = getSampleCheatsheet(courseCode);

  return (
    <Modal title="Sample cheat sheet" onClose={onClose}>
      {sample ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">{sample.title}</p>
          {sample.notes.map((note, i) => (
            <p key={i} className="text-sm text-grey">
              {note}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-grey">
          No sample available yet for {courseCode || "this course"}.
        </p>
      )}
    </Modal>
  );
}
