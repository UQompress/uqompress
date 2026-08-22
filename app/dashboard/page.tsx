"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { FrequencyChart } from "@/components/dashboard/FrequencyChart";
import { useStudioStore } from "@/lib/store";
import { plainTextToBlockHtml } from "@/lib/rich-text";

export default function DashboardPage() {
  const router = useRouter();
  const courseCode = useStudioStore((s) => s.courseCode);
  const topics = useStudioStore((s) => s.topics);
  const selectedTopicId = useStudioStore((s) => s.selectedTopicId);
  const setSelectedTopicId = useStudioStore((s) => s.setSelectedTopicId);
  const addBlock = useStudioStore((s) => s.addBlock);

  const [isInserting, setIsInserting] = useState(false);
  const [justInserted, setJustInserted] = useState<string | null>(null);

  useEffect(() => {
    if (!courseCode) router.replace("/");
  }, [courseCode, router]);

  useEffect(() => {
    if (!selectedTopicId && topics.length > 0) {
      setSelectedTopicId(topics[0].id);
    }
  }, [selectedTopicId, topics, setSelectedTopicId]);

  const selectedTopic = topics.find((t) => t.id === selectedTopicId) ?? null;

  async function handleInsert() {
    if (!selectedTopic) return;
    setIsInserting(true);
    setJustInserted(null);
    try {
      const res = await fetch("/api/insert-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: selectedTopic }),
      });
      const data = (await res.json()) as { content?: string };
      addBlock("text", plainTextToBlockHtml(data.content ?? selectedTopic.name, "body"), {
        textKind: "body",
      });
      setJustInserted(selectedTopic.id);
    } finally {
      setIsInserting(false);
    }
  }

  if (topics.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar courseCode={courseCode} active="dashboard" />
        <main className="flex flex-1 items-center justify-center text-sm text-grey">
          No analysis yet — go back to setup and upload course materials.
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar courseCode={courseCode} active="dashboard" />
      <main className="grid flex-1 grid-cols-1 gap-8 px-8 py-10 md:grid-cols-[1.3fr_1px_1fr]">
        <section>
          <h2 className="mb-6 text-sm font-medium text-grey">
            Topics by exam frequency
          </h2>
          <FrequencyChart
            topics={topics}
            selectedTopicId={selectedTopicId}
            onSelect={setSelectedTopicId}
          />
        </section>

        <div className="hidden bg-grey-light md:block" />

        <section className="flex flex-col gap-6">
          {selectedTopic ? (
            <>
              <div>
                <h2 className="text-lg font-semibold">{selectedTopic.name}</h2>
                <p className="mt-1 text-sm text-uq-purple">
                  Frequency score: {selectedTopic.frequencyScore}
                </p>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wide text-grey">
                  Why this matters
                </h3>
                <p className="mt-1 text-sm">{selectedTopic.rationale}</p>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wide text-grey">
                  Source excerpt
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-grey">
                  {selectedTopic.sourceExcerpt}
                </p>
              </div>

              <button
                type="button"
                onClick={handleInsert}
                disabled={isInserting}
                className="flex w-fit items-center gap-2 bg-uq-purple px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {justInserted === selectedTopic.id ? (
                  <>
                    <Check size={16} strokeWidth={1.5} />
                    Added to cheat sheet
                  </>
                ) : isInserting ? (
                  "Drafting..."
                ) : (
                  "Insert into cheat sheet"
                )}
              </button>
            </>
          ) : null}
        </section>
      </main>

      <footer className="flex justify-end border-t border-grey-light px-8 py-4">
        <button
          type="button"
          onClick={() => router.push("/editor")}
          className="flex items-center gap-2 text-sm font-medium text-uq-purple"
        >
          Go to editor
          <ArrowRight size={16} strokeWidth={1.5} />
        </button>
      </footer>
    </div>
  );
}
