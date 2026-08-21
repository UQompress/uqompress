"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { useStudioStore } from "@/lib/store";
import { MOCK_TOPICS } from "@/lib/mock-data";
import type { ExtractedFile } from "@/lib/types";

export default function SetupPage() {
  const router = useRouter();
  const courseCode = useStudioStore((s) => s.courseCode);
  const ecpText = useStudioStore((s) => s.ecpText);
  const setEcpText = useStudioStore((s) => s.setEcpText);
  const files = useStudioStore((s) => s.files);
  const setFiles = useStudioStore((s) => s.setFiles);
  const setTopics = useStudioStore((s) => s.setTopics);
  const setAnalysisStatus = useStudioStore((s) => s.setAnalysisStatus);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!courseCode) router.replace("/");
  }, [courseCode, router]);

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
        // No materials uploaded — fall back to the mocked dashboard so the
        // flow stays demoable without requiring real course PDFs.
        setTopics(MOCK_TOPICS);
        setAnalysisStatus("done");
        router.push("/dashboard");
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
      const data = (await res.json()) as { topics: typeof MOCK_TOPICS };
      setTopics(data.topics);
      setAnalysisStatus("done");
      router.push("/dashboard");
    } catch (err) {
      setAnalysisStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsAnalysing(false);
    }
  }

  const busy = isExtracting || isAnalysing;

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
              (optional — paste from the ECP manually)
            </span>
          </label>
          <textarea
            value={ecpText}
            onChange={(e) => setEcpText(e.target.value)}
            rows={4}
            placeholder="Paste course learning outcomes here..."
            className="w-full resize-none border border-grey-light px-3 py-2 text-sm outline-none focus:border-uq-purple"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Course materials</label>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 border border-dashed border-grey-light px-4 py-10 text-sm text-grey hover:border-uq-purple hover:text-uq-purple"
          >
            <Upload size={20} strokeWidth={1.5} />
            Upload past exam PDFs and lecture slides
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
