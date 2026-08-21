"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useStudioStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const setCourseCode = useStudioStore((s) => s.setCourseCode);
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = value.trim().toUpperCase();
    if (!code) return;
    setCourseCode(code);
    router.push("/setup");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-center">
          CheatSheet Studio
        </h1>
        <p className="mt-2 text-center text-sm text-grey">
          Build a page-constrained cheat sheet, backed by AI analysis of your
          course&apos;s past papers.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-3">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Course code, e.g. CSSE2010"
            className="w-full border border-grey-light px-4 py-3 text-sm outline-none focus:border-uq-purple"
          />
          <button
            type="submit"
            disabled={!value.trim()}
            className="flex items-center justify-center gap-2 bg-uq-purple px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            Get started
            <ArrowRight size={16} strokeWidth={1.5} />
          </button>
        </form>
      </div>
    </main>
  );
}
