"use client";

import Link from "next/link";

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
}: {
  courseCode?: string;
  active: Step;
}) {
  return (
    <header className="flex items-center justify-between border-b border-grey-light px-8 py-4">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          CheatSheet Studio
        </Link>
        {courseCode ? (
          <span className="text-sm text-grey">{courseCode}</span>
        ) : null}
      </div>
      <nav className="flex items-center gap-6">
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
      </nav>
    </header>
  );
}
