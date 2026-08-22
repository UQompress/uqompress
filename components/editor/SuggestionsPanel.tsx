"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ArrowLeft } from "lucide-react";
import { Modal } from "@/components/Modal";
import { useStudioStore } from "@/lib/store";
import type { GeneratedContent, QuestionnaireAnswer, QuestionnaireQuestion } from "@/lib/types";
import { Questionnaire } from "./Questionnaire";
import { QuestionnaireResults } from "./QuestionnaireResults";

function DraggableContentItem({ id, content }: { id: string; content: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `content-${id}`,
    data: { source: "suggestion-content", content },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab whitespace-pre-wrap border border-grey-light px-3 py-2 text-sm hover:border-uq-purple ${isDragging ? "opacity-40" : ""}`}
    >
      {content}
    </div>
  );
}

function ContentSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs uppercase tracking-wide text-grey">{title}</h3>
      {items.map((item, i) => (
        <DraggableContentItem key={i} id={`${title}-${i}`} content={item} />
      ))}
    </div>
  );
}

// References backing the theory/sampleExamples/commonErrors fragments —
// informational only, not draggable onto the cheat sheet, so it's shown in
// its own popup rather than inline among the draggable content.
function SourcesList({ sources }: { sources: string[] }) {
  if (sources.length === 0) {
    return <p className="text-sm text-grey">No sources were cited for this content.</p>;
  }

  function renderSource(source: string) {
    const urlMatch = source.match(/https?:\/\/\S+/);
    if (!urlMatch) return source;
    const url = urlMatch[0];
    const label = source.slice(0, urlMatch.index).replace(/[—-]\s*$/, "").trim();
    return (
      <>
        {label ? `${label} — ` : ""}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-uq-purple underline hover:no-underline"
        >
          {url}
        </a>
      </>
    );
  }

  return (
    <ul className="flex flex-col gap-2 text-sm">
      {sources.map((source, i) => (
        <li key={i} className="border border-grey-light px-3 py-2">
          {renderSource(source)}
        </li>
      ))}
    </ul>
  );
}

export function SuggestionsPanel() {
  const topics = useStudioStore((s) => s.topics);
  const files = useStudioStore((s) => s.files);
  const selectedTopicId = useStudioStore((s) => s.selectedTopicId);
  const selectedQuestionTypeId = useStudioStore((s) => s.selectedQuestionTypeId);
  const setSelectedTopicId = useStudioStore((s) => s.setSelectedTopicId);
  const setSelectedQuestionTypeId = useStudioStore((s) => s.setSelectedQuestionTypeId);
  const generatedContent = useStudioStore((s) => s.generatedContent);
  const setGeneratedContentStore = useStudioStore((s) => s.setGeneratedContent);
  const appendGeneratedContentStore = useStudioStore((s) => s.appendGeneratedContent);
  const setQuestionnaireAnswersStore = useStudioStore((s) => s.setQuestionnaireAnswers);

  const [questionnaire, setQuestionnaire] = useState<QuestionnaireQuestion[] | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<QuestionnaireAnswer[] | null>(null);
  const [isGeneratingQuestionnaire, setIsGeneratingQuestionnaire] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);

  const selectedTopic = topics.find((t) => t.id === selectedTopicId) ?? null;
  const selectedQuestionType =
    selectedTopic?.questionTypes.find((qt) => qt.id === selectedQuestionTypeId) ?? null;
  const cachedContent = selectedQuestionTypeId ? generatedContent[selectedQuestionTypeId] : undefined;

  async function generateContent(answers?: QuestionnaireAnswer[]) {
    if (!selectedTopic || !selectedQuestionType) return;
    setIsGeneratingContent(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicName: selectedTopic.name,
          questionTypeName: selectedQuestionType.name,
          sourceExcerpt: selectedTopic.sourceExcerpt,
          sourceFileNames: files.map((f) => f.name),
          answers,
        }),
      });
      const data = (await res.json()) as GeneratedContent & { error?: string };
      if (data.error) throw new Error(data.error);
      setGeneratedContentStore(selectedQuestionType.id, data);
    } catch {
      setError("Could not generate content for this question type.");
    } finally {
      setIsGeneratingContent(false);
    }
  }

  async function handleViewMore() {
    if (!selectedTopic || !selectedQuestionType || !cachedContent) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicName: selectedTopic.name,
          questionTypeName: selectedQuestionType.name,
          sourceExcerpt: selectedTopic.sourceExcerpt,
          sourceFileNames: files.map((f) => f.name),
          existingContent: cachedContent,
        }),
      });
      const data = (await res.json()) as GeneratedContent & { error?: string };
      if (data.error) throw new Error(data.error);
      appendGeneratedContentStore(selectedQuestionType.id, data);
    } catch {
      setError("Could not fetch more content for this question type.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleDoQuestionnaire() {
    if (!selectedTopic || !selectedQuestionType) return;
    setIsGeneratingQuestionnaire(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicName: selectedTopic.name,
          questionTypeName: selectedQuestionType.name,
          sourceExcerpt: selectedTopic.sourceExcerpt,
        }),
      });
      const data = (await res.json()) as { questions?: QuestionnaireQuestion[]; error?: string };
      if (data.error || !data.questions) throw new Error(data.error ?? "Failed");
      setQuestionnaire(data.questions);
    } catch {
      setError("Could not generate the questionnaire — try Skip instead.");
    } finally {
      setIsGeneratingQuestionnaire(false);
    }
  }

  // Submitting the quiz shows a results/summary screen first (score + what to
  // revise) rather than jumping straight into content generation — the
  // student explicitly continues from there.
  function handleQuestionnaireSubmit(answers: QuestionnaireAnswer[]) {
    if (!selectedQuestionType) return;
    setQuestionnaireAnswersStore(selectedQuestionType.id, answers);
    setQuizAnswers(answers);
  }

  function closeQuestionnaireModal() {
    setQuestionnaire(null);
    setQuizAnswers(null);
  }

  async function handleResultsContinue() {
    const answers = quizAnswers ?? undefined;
    closeQuestionnaireModal();
    await generateContent(answers);
  }

  async function handleQuestionnaireSkip() {
    closeQuestionnaireModal();
    await generateContent(undefined);
  }

  const questionnaireModal = questionnaire && (
    <Modal
      title={quizAnswers ? "Your results" : "Quick questionnaire"}
      onClose={closeQuestionnaireModal}
      size="lg"
    >
      {quizAnswers ? (
        <QuestionnaireResults
          questions={questionnaire}
          answers={quizAnswers}
          onContinue={handleResultsContinue}
          isGenerating={isGeneratingContent}
        />
      ) : (
        <Questionnaire
          questions={questionnaire}
          onSubmit={handleQuestionnaireSubmit}
          onCancel={closeQuestionnaireModal}
          onSkip={handleQuestionnaireSkip}
        />
      )}
    </Modal>
  );

  if (topics.length === 0) {
    return (
      <aside className="w-72 shrink-0 border-l border-grey-light px-4 py-6">
        <h2 className="mb-2 text-xs uppercase tracking-wide text-grey">AI suggestions</h2>
        <p className="text-sm text-grey">No analysis yet — upload materials from Setup.</p>
      </aside>
    );
  }

  // Level 0: ranked topic list.
  if (!selectedTopic) {
    const ranked = [...topics].sort((a, b) => b.frequencyScore - a.frequencyScore);
    return (
      <aside className="flex w-72 shrink-0 flex-col gap-2 overflow-y-auto border-l border-grey-light px-4 py-6">
        <h2 className="mb-2 text-xs uppercase tracking-wide text-grey">
          Topic cluster — by exam frequency
        </h2>
        {ranked.map((topic, i) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => setSelectedTopicId(topic.id)}
            className="flex flex-col items-start border border-grey-light px-3 py-2 text-left text-sm hover:border-uq-purple"
          >
            <span className="font-medium">
              {i + 1}. {topic.name}
            </span>
            <span className="text-xs text-grey">
              {topic.questionCount} question{topic.questionCount === 1 ? "" : "s"} · {topic.frequencyScore}%
            </span>
          </button>
        ))}
      </aside>
    );
  }

  // Level 1: question types within the selected topic.
  if (!selectedQuestionType) {
    return (
      <aside className="flex w-72 shrink-0 flex-col gap-2 overflow-y-auto border-l border-grey-light px-4 py-6">
        <button
          type="button"
          onClick={() => setSelectedTopicId(null)}
          className="flex items-center gap-1 text-xs text-grey hover:text-foreground"
        >
          <ArrowLeft size={12} strokeWidth={1.5} />
          Topics
        </button>
        <h2 className="mt-1 text-sm font-medium">{selectedTopic.name}</h2>
        <p className="mb-2 text-xs uppercase tracking-wide text-grey">Question types</p>
        {selectedTopic.questionTypes.map((qt) => (
          <button
            key={qt.id}
            type="button"
            onClick={() => setSelectedQuestionTypeId(qt.id)}
            className="flex flex-col items-start border border-grey-light px-3 py-2 text-left text-sm hover:border-uq-purple"
          >
            <span className="font-medium">{qt.name}</span>
            <span className="text-xs text-grey">
              {qt.questionCount} question{qt.questionCount === 1 ? "" : "s"}
            </span>
          </button>
        ))}
      </aside>
    );
  }

  // Level 3: categorized draggable content, once generated.
  if (cachedContent) {
    return (
      <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-grey-light px-4 py-6">
        <button
          type="button"
          onClick={() => setSelectedQuestionTypeId(null)}
          className="flex items-center gap-1 text-xs text-grey hover:text-foreground"
        >
          <ArrowLeft size={12} strokeWidth={1.5} />
          Question types
        </button>
        <h2 className="text-sm font-medium">{selectedQuestionType.name}</h2>
        <ContentSection title="1. Key Theory" items={cachedContent.theory} />
        <ContentSection title="2. Example Question & Solution" items={cachedContent.sampleExamples} />
        <ContentSection title="3. Common Errors" items={cachedContent.commonErrors} />
        {error && <p className="text-xs text-red-700">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleViewMore}
            disabled={isLoadingMore}
            className="self-start border border-grey-light px-4 py-2 text-sm hover:border-uq-purple disabled:opacity-40"
          >
            {isLoadingMore ? "Loading..." : "View more"}
          </button>
          <button
            type="button"
            onClick={() => setShowSources(true)}
            className="self-start border border-grey-light px-4 py-2 text-sm hover:border-uq-purple"
          >
            Sources
          </button>
        </div>
        {showSources && (
          <Modal title="Sources" onClose={() => setShowSources(false)}>
            <SourcesList sources={cachedContent.sources} />
          </Modal>
        )}
      </aside>
    );
  }

  // Level 2: choice between questionnaire and skip (questionnaire itself opens in a modal).
  return (
    <>
      <aside className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l border-grey-light px-4 py-6">
        <button
          type="button"
          onClick={() => setSelectedQuestionTypeId(null)}
          className="flex items-center gap-1 text-xs text-grey hover:text-foreground"
        >
          <ArrowLeft size={12} strokeWidth={1.5} />
          Question types
        </button>
        <h2 className="text-sm font-medium">{selectedQuestionType.name}</h2>
        <p className="text-sm text-grey">
          Answer 5 quick questions so the suggestions match what you actually need, or skip
          straight to AI-suggested content.
        </p>
        {error && <p className="text-xs text-red-700">{error}</p>}
        <button
          type="button"
          onClick={handleDoQuestionnaire}
          disabled={isGeneratingQuestionnaire || isGeneratingContent}
          className="bg-uq-purple px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {isGeneratingQuestionnaire ? "Preparing questionnaire..." : "Do questionnaire"}
        </button>
        <button
          type="button"
          onClick={() => generateContent(undefined)}
          disabled={isGeneratingQuestionnaire || isGeneratingContent}
          className="border border-grey-light px-4 py-2 text-sm hover:border-uq-purple disabled:opacity-40"
        >
          {isGeneratingContent ? "Generating..." : "Skip questionnaire"}
        </button>
      </aside>
      {questionnaireModal}
    </>
  );
}
