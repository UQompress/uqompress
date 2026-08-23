"use client";

import { ExternalLink, FileText } from "lucide-react";
import { Modal } from "@/components/Modal";
import { formatFileSize, getMaterialKind, type MaterialKind } from "@/lib/materials";
import type { ExtractedFile } from "@/lib/types";

const KIND_ORDER: MaterialKind[] = ["Past paper", "Lecture", "Other"];
const KIND_HEADING: Record<MaterialKind, string> = {
  "Past paper": "Past papers",
  Lecture: "Lectures",
  Other: "Other materials",
};

export function ViewMaterialsModal({
  files,
  onClose,
}: {
  files: ExtractedFile[];
  onClose: () => void;
}) {
  if (files.length === 0) {
    return (
      <Modal title="View materials" onClose={onClose} size="lg">
        <p className="text-sm text-grey">
          No materials have been uploaded yet. Add lecture slides or past papers from Setup.
        </p>
      </Modal>
    );
  }

  return (
    <Modal title="View materials" onClose={onClose} size="lg">
      <div className="flex flex-col gap-6">
        <p className="text-sm text-grey">
          Open any uploaded PDF in a new tab while you work on your cheat sheet.
        </p>

        {KIND_ORDER.map((kind) => {
          const matchingFiles = files.filter((file) => getMaterialKind(file.name) === kind);
          if (matchingFiles.length === 0) return null;

          return (
            <section key={kind} className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-grey">
                {KIND_HEADING[kind]}
              </h3>
              <ul className="divide-y divide-grey-light border border-grey-light">
                {matchingFiles.map((file, index) => {
                  const fileSize = formatFileSize(file.sizeBytes);
                  return (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText
                          size={18}
                          strokeWidth={1.5}
                          className="shrink-0 text-uq-purple"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-grey">
                            {fileSize ? `${kind} · ${fileSize}` : kind}
                          </p>
                        </div>
                      </div>

                      {file.pdfUrl ? (
                        <a
                          href={file.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${file.name} in a new tab`}
                          className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-uq-purple hover:underline"
                        >
                          Open PDF
                          <ExternalLink size={14} strokeWidth={1.5} />
                        </a>
                      ) : (
                        <span className="shrink-0 text-xs text-grey">Re-upload to open</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </Modal>
  );
}
