"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useStudioStore } from "@/lib/store";

const HOW_IT_WORKS = [
  "Choose course code",
  "Upload course material",
  "AI analyses and extracts info",
  "Do quizzes with Sharky to learn",
  "Build cheat sheet",
];

export default function Home() {
  const router = useRouter();
  const startNewCourse = useStudioStore((s) => s.startNewCourse);
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = value.trim().toUpperCase();
    if (!code) return;
    startNewCourse(code);
    router.push("/setup");
  }

  return (
    <main className="flex h-dvh flex-1 flex-row overflow-hidden">
      <section className="relative h-full w-1/2 overflow-hidden bg-uq-purple">
        <Image
          src="/landing-image.png"
          alt="UQompress"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
      </section>

      <section className="flex w-1/2 flex-col justify-between bg-white px-10 py-12 md:px-14 md:py-16 lg:px-20 lg:py-20">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold tracking-tight">How it works:</h2>
          <ol className="mt-6 list-decimal space-y-2.5 pl-5 text-[15px] leading-relaxed">
            {HOW_IT_WORKS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-14 flex w-full max-w-sm flex-col gap-3 md:mt-0"
        >
          <label htmlFor="course-code" className="text-sm font-medium">
            Course code
          </label>
          <input
            id="course-code"
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
      </section>
    </main>
  );
}
