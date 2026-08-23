"use client";

import Link from "next/link";
import { Download } from "lucide-react";

type Step = "setup" | "dashboard" | "editor";

// "dashboard" is intentionally left out of the primary nav — the AI
// Suggestion Bar inside the editor replaced it as the main analysis surface.
// The route (and this Step value) still exist for direct navigation.
const STEPS: { key: Step; label: string; href: string }[] = [
  { key: "setup", label: "Setup", href: "/setup" },
  { key: "editor", label: "Editor", href: "/editor" },
];

export function TopBar({
  courseCode,
  active,
  wordmark = "UQompress",
  onSamplesClick,
  onMaterialsClick,
  onExportClick,
  isExporting,
}: {
  courseCode?: string;
  active: Step;
  wordmark?: string;
  onSamplesClick?: () => void;
  onMaterialsClick?: () => void;
  onExportClick?: () => void;
  isExporting?: boolean;
}) {
  return (
    <header className="flex items-center justify-between border-b border-grey-light px-8 py-4">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          {wordmark}
        </Link>
        {courseCode ? (
          <span className="text-sm text-grey">{courseCode}</span>
        ) : null}
      </div>
      <nav className="flex items-center gap-6">
        {onSamplesClick ? (
          <button
            type="button"
            onClick={onSamplesClick}
            className="text-sm text-grey hover:text-foreground"
          >
            Samples
          </button>
        ) : null}
        {onMaterialsClick ? (
          <button
            type="button"
            onClick={onMaterialsClick}
            className="text-sm text-grey hover:text-foreground"
          >
            View materials
          </button>
        ) : null}
        {STEPS.map((step) => (
          <Link
            key={step.key}
            href={step.href}
            className={
              step.key === active
                ? "text-sm font-medium text-uq-purple"
                : "text-sm text-grey hover:text-foreground"
            }
          >
            {step.label}
          </Link>
        ))}
        {onExportClick ? (
          <button
            type="button"
            onClick={onExportClick}
            disabled={isExporting}
            className="flex items-center gap-2 bg-uq-purple px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            <Download size={16} strokeWidth={1.5} />
            {isExporting ? "Exporting..." : "Export to PDF"}
          </button>
        ) : null}
      </nav>
    </header>
  );
}
