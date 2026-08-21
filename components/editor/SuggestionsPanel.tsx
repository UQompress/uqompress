"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Topic } from "@/lib/types";

function SuggestionItem({ topic }: { topic: Topic }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `suggestion-${topic.id}`,
    data: { source: "suggestion", topic },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab border border-grey-light px-3 py-2 text-sm hover:border-uq-purple ${isDragging ? "opacity-40" : ""}`}
    >
      <p className="font-medium">{topic.name}</p>
      <p className="mt-1 text-xs text-grey">Frequency {topic.frequencyScore}</p>
    </div>
  );
}

export function SuggestionsPanel({ topics }: { topics: Topic[] }) {
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-2 border-l border-grey-light px-4 py-6">
      <h2 className="mb-2 text-xs uppercase tracking-wide text-grey">
        AI suggestions
      </h2>
      {topics.length === 0 ? (
        <p className="text-sm text-grey">
          No analysis yet — run analysis from the setup page.
        </p>
      ) : (
        topics.map((topic) => <SuggestionItem key={topic.id} topic={topic} />)
      )}
    </aside>
  );
}
