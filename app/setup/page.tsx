"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, RectangleHorizontal, RectangleVertical, Upload, X } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { useStudioStore } from "@/lib/store";
import { MOCK_TOPICS, MOCK_TOTAL_QUESTIONS } from "@/lib/mock-data";
import type { ExtractedFile, Orientation, Topic } from "@/lib/types";

export default function SetupPage() {
  const router = useRouter();
  const courseCode = useStudioStore((s) => s.courseCode);
  const ecpText = useStudioStore((s) => s.ecpText);
  const setEcpText = useStudioStore((s) => s.setEcpText);
  const files = useStudioStore((s) => s.files);
  const setFiles = useStudioStore((s) => s.setFiles);
  const setAnalysisResult = useStudioStore((s) => s.setAnalysisResult);
  const setAnalysisStatus = useStudioStore((s) => s.setAnalysisStatus);
  const setOrientation = useStudioStore((s) => s.setOrientation);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "orientation">("form");
  const inputRef = useRef<HTMLInputElement>(null);

  const [ecpLookupStatus, setEcpLookupStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [ecpSource, setEcpSource] = useState<{ semesterLabel: string; profileUrl: string } | null>(
    null,
  );
  const [ecpLookupError, setEcpLookupError] = useState<string | null>(null);
  const hasLookedUp = useRef(false);

  useEffect(() => {
    if (!courseCode) router.replace("/");
  }, [courseCode, router]);

  useEffect(() => {
    if (!courseCode || hasLookedUp.current) return;
    hasLookedUp.current = true;

    setEcpLookupStatus("loading");
    fetch("/api/lookup-ecp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseCode }),
    })
      .then((res) => res.json())
      .then((data: { outcomes?: string; semesterLabel?: string; profileUrl?: string; error?: string }) => {
        if (data.error || !data.outcomes) {
          setEcpLookupStatus("error");
          setEcpLookupError(data.error ?? "Could not find learning outcomes online.");
          return;
        }
        // Only auto-fill if the student hasn't already pasted something in.
        if (!ecpText.trim()) setEcpText(data.outcomes);
        setEcpSource({
          semesterLabel: data.semesterLabel ?? "",
          profileUrl: data.profileUrl ?? "",
        });
        setEcpLookupStatus("done");
      })
      .catch(() => {
        setEcpLookupStatus("error");
        setEcpLookupError("Could not find learning outcomes online.");
      });
    // Only run once per course code on mount — ecpText/setEcpText intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseCode]);

  function handleFilesSelected(list: FileList | null) {
    if (!list) return;
    const pdfs = Array.from(list).filter((f) => f.type === "application/pdf");
    setPendingFiles((prev) => [...prev, ...pdfs]);
  }

  function removePendingFile(name: string) {
    setPendingFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function extractPendingFiles(): Promise<ExtractedFile[]> {
    if (pendingFiles.length === 0) return files;
    setIsExtracting(true);
    setError(null);
    try {
      const formData = new FormData();
      for (const file of pendingFiles) formData.append("files", file);

      const res = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Text extraction failed.");
      const data = (await res.json()) as { files: ExtractedFile[] };
      const merged = [...files, ...data.files];
      setFiles(merged);
      setPendingFiles([]);
      return merged;
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleAnalyse() {
    setError(null);
    try {
      const extracted = await extractPendingFiles();

      if (extracted.length === 0) {
        // No materials uploaded — fall back to mocked analysis so the flow
        // stays demoable without requiring real course PDFs.
        setAnalysisResult(MOCK_TOPICS, MOCK_TOTAL_QUESTIONS);
        setAnalysisStatus("done");
        setStep("orientation");
        return;
      }

      setIsAnalysing(true);
      setAnalysisStatus("loading");
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseCode, ecpText, files: extracted }),
      });
      if (!res.ok) throw new Error("Analysis failed.");
      const data = (await res.json()) as { topics: Topic[]; totalQuestions: number };
      setAnalysisResult(data.topics, data.totalQuestions);
      setAnalysisStatus("done");
      setStep("orientation");
    } catch (err) {
      setAnalysisStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsAnalysing(false);
    }
  }

  function handleOrientationChoice(orientation: Orientation) {
    setOrientation(orientation);
    router.push("/editor");
  }

  const busy = isExtracting || isAnalysing;

  if (step === "orientation") {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar courseCode={courseCode} active="setup" />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
          <div className="text-center">
            <h1 className="text-lg font-semibold">Page orientation</h1>
            <p className="mt-1 text-sm text-grey">
              Choose the shape of your physical cheat sheet page.
            </p>
          </div>
          <div className="flex gap-8">
            <button
              type="button"
              onClick={() => handleOrientationChoice("portrait")}
              className="flex flex-col items-center gap-3 border border-grey-light px-12 py-10 text-base hover:border-uq-purple hover:text-uq-purple"
            >
              <RectangleVertical size={64} strokeWidth={1.5} />
              Portrait
            </button>
            <button
              type="button"
              onClick={() => handleOrientationChoice("landscape")}
              className="flex flex-col items-center gap-3 border border-grey-light px-12 py-10 text-base hover:border-uq-purple hover:text-uq-purple"
            >
              <RectangleHorizontal size={64} strokeWidth={1.5} />
              Landscape
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar courseCode={courseCode} active="setup" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-12">
        <div>
          <span className="text-xs uppercase tracking-wide text-grey">
            Course
          </span>
          <h1 className="text-xl font-semibold">{courseCode}</h1>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Learning outcomes{" "}
            <span className="font-normal text-grey">
              (looked up automatically from the course profile — edit or paste over it if needed)
            </span>
          </label>
          <textarea
            value={ecpText}
            onChange={(e) => setEcpText(e.target.value)}
            rows={6}
            placeholder={
              ecpLookupStatus === "loading"
                ? "Looking up learning outcomes..."
                : "Paste course learning outcomes here..."
            }
            className="w-full resize-none border border-grey-light px-3 py-2 text-sm outline-none focus:border-uq-purple"
          />
          {ecpLookupStatus === "loading" && (
            <p className="flex items-center gap-1.5 text-xs text-grey">
              <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
              Looking up {courseCode} on the UQ course profile site...
            </p>
          )}
          {ecpLookupStatus === "done" && ecpSource && (
            <p className="text-xs text-grey">
              Auto-filled from{" "}
              <a
                href={ecpSource.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-uq-purple underline"
              >
                {ecpSource.semesterLabel}
              </a>
            </p>
          )}
          {ecpLookupStatus === "error" && (
            <p className="text-xs text-grey">{ecpLookupError} — paste manually instead.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Your materials{" "}
            <span className="font-normal text-grey">
              (whatever you personally want to study from and put on your cheat sheet)
            </span>
          </label>
          <p className="text-xs text-grey">
            Upload lecture slides, tutorial solutions, and past exams — your own choice of
            what to learn from, not a fixed course curriculum. That keeps the analysis
            current and matched to what you specifically need, rather than frozen to
            whatever a pre-trained per-course model happened to be trained on.
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 border border-dashed border-grey-light px-4 py-10 text-sm text-grey hover:border-uq-purple hover:text-uq-purple"
          >
            <Upload size={20} strokeWidth={1.5} />
            Upload PDFs (lecture slides, tutorial solutions, past exams)
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />

          {(files.length > 0 || pendingFiles.length > 0) && (
            <ul className="mt-2 flex flex-col gap-1">
              {files.map((f) => (
                <li
                  key={f.name}
                  className="flex items-center gap-2 text-sm text-grey"
                >
                  <FileText size={14} strokeWidth={1.5} />
                  {f.name}
                  <span className="text-xs">extracted</span>
                </li>
              ))}
              {pendingFiles.map((f) => (
                <li
                  key={f.name}
                  className="flex items-center gap-2 text-sm"
                >
                  <FileText size={14} strokeWidth={1.5} />
                  {f.name}
                  <button
                    type="button"
                    onClick={() => removePendingFile(f.name)}
                    className="text-grey hover:text-foreground"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <button
          type="button"
          onClick={handleAnalyse}
          disabled={busy}
          className="self-start bg-uq-purple px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {isExtracting
            ? "Extracting text..."
            : isAnalysing
              ? "Analysing..."
              : "Analyse"}
        </button>
      </main>
    </div>
  );
}
