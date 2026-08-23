"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ChevronDown, Sparkles } from "lucide-react";
import { Modal } from "@/components/Modal";
import { prepareQuickFillContent } from "@/lib/prepare-quick-fill";
import { buildQuickFillLayout } from "@/lib/quick-fill";
import { useStudioStore } from "@/lib/store";
import type {
  GeneratedContent,
  QuestionnaireAnswer,
  QuestionnaireQuestion,
  QuestionType,
  Topic,
} from "@/lib/types";
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
      className={`cursor-grab whitespace-pre-wrap border border-grey-light px-2 py-1.5 text-sm hover:border-uq-purple ${isDragging ? "opacity-40" : ""}`}
    >
      {content}
    </div>
  );
}

function ContentSection({
  title,
  items,
  idPrefix,
}: {
  title: string;
  items: string[];
  idPrefix: string;
}) {
  const [open, setOpen] = useState(true);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-xs uppercase tracking-wide text-grey"
      >
        {title}
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className={`transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
        />
      </button>
      {open
        ? items.map((item, i) => (
            <DraggableContentItem key={i} id={`${idPrefix}-${i}`} content={item} />
          ))
        : null}
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

function AccordionChevron({ open }: { open: boolean }) {
  return (
    <ChevronDown
      size={14}
      strokeWidth={1.5}
      className={`shrink-0 text-grey transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
    />
  );
}

export function SuggestionsPanel({ onCanvasFilled }: { onCanvasFilled?: () => void }) {
  const topics = useStudioStore((s) => s.topics);
  const files = useStudioStore((s) => s.files);
  const generatedContent = useStudioStore((s) => s.generatedContent);
  const orientation = useStudioStore((s) => s.orientation);
  const gridRows = useStudioStore((s) => s.gridRows);
  const gridCols = useStudioStore((s) => s.gridCols);
  const blocks = useStudioStore((s) => s.blocks);
  const setGeneratedContentStore = useStudioStore((s) => s.setGeneratedContent);
  const setGeneratedContentsStore = useStudioStore((s) => s.setGeneratedContents);
  const appendGeneratedContentStore = useStudioStore((s) => s.appendGeneratedContent);
  const setQuestionnaireAnswersStore = useStudioStore((s) => s.setQuestionnaireAnswers);
  const quickFillCanvas = useStudioStore((s) => s.quickFillCanvas);

  const [openTopicIds, setOpenTopicIds] = useState<Set<string>>(new Set());
  const [openQuestionTypeIds, setOpenQuestionTypeIds] = useState<Set<string>>(new Set());
  const [pendingTarget, setPendingTarget] = useState<{
    topicId: string;
    questionTypeId: string;
  } | null>(null);
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireQuestion[] | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<QuestionnaireAnswer[] | null>(null);
  const [generatingQuestionnaireId, setGeneratingQuestionnaireId] = useState<string | null>(null);
  const [generatingContentIds, setGeneratingContentIds] = useState<Set<string>>(new Set());
  const [loadingMoreId, setLoadingMoreId] = useState<string | null>(null);
  const [skippingAll, setSkippingAll] = useState(false);
  const [error, setError] = useState<{ questionTypeId: string; message: string } | null>(null);
  const [sourcesQuestionTypeId, setSourcesQuestionTypeId] = useState<string | null>(null);
  const [showQuickFillConfirm, setShowQuickFillConfirm] = useState(false);
  const [quickFillMessage, setQuickFillMessage] = useState<string | null>(null);
  const [isQuickFilling, setIsQuickFilling] = useState(false);

  function toggleSet(setter: Dispatch<SetStateAction<Set<string>>>, id: string) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openIds(setter: Dispatch<SetStateAction<Set<string>>>, ids: string[]) {
    setter((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }

  function markGenerating(id: string, busy: boolean) {
    setGeneratingContentIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function generateContent(
    topic: Topic,
    questionType: QuestionType,
    answers?: QuestionnaireAnswer[],
  ) {
    markGenerating(questionType.id, true);
    setError(null);
    openIds(setOpenTopicIds, [topic.id]);
    openIds(setOpenQuestionTypeIds, [questionType.id]);
    try {
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicName: topic.name,
          questionTypeName: questionType.name,
          sourceExcerpt: topic.sourceExcerpt,
          sourceFileNames: files.map((f) => f.name),
          answers,
        }),
      });
      const data = (await res.json()) as GeneratedContent & { error?: string };
      if (data.error) throw new Error(data.error);
      setGeneratedContentStore(questionType.id, data);
    } catch {
      setError({
        questionTypeId: questionType.id,
        message: "Could not generate content for this question type.",
      });
    } finally {
      markGenerating(questionType.id, false);
    }
  }

  async function handleSkipAll() {
    const pending = topics.flatMap((topic) =>
      topic.questionTypes
        .filter((qt) => !generatedContent[qt.id])
        .map((questionType) => ({ topic, questionType })),
    );
    if (pending.length === 0) return;
    setSkippingAll(true);
    openIds(
      setOpenTopicIds,
      pending.map(({ topic }) => topic.id),
    );
    try {
      for (const { topic, questionType } of pending) {
        await generateContent(topic, questionType, undefined);
      }
    } finally {
      setSkippingAll(false);
    }
  }

  function applyQuickFill(content: Record<string, GeneratedContent>) {
    const layout = buildQuickFillLayout({
      topics,
      generatedContent: content,
      orientation,
      gridRows,
      gridCols,
    });
    if (layout.blocks.length === 0) return;

    quickFillCanvas(layout.blocks, layout.pageCount);
    setShowQuickFillConfirm(false);
    setQuickFillMessage(
      `Filled ${layout.topicCount} topic${layout.topicCount === 1 ? "" : "s"} across ${layout.pageCount} page${layout.pageCount === 1 ? "" : "s"}.`,
    );
    onCanvasFilled?.();
    requestAnimationFrame(() => {
      document.getElementById("cheat-sheet-page-0")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  async function prepareAndApplyQuickFill() {
    if (isQuickFilling) return;
    setIsQuickFilling(true);
    setQuickFillMessage(null);
    try {
      const readyContent = await prepareQuickFillContent({
        topics,
        sourceFileNames: files.map((file) => file.name),
        existingContent: generatedContent,
      });
      setGeneratedContentsStore(readyContent);
      applyQuickFill(readyContent);
    } catch (err) {
      setQuickFillMessage(
        err instanceof Error
          ? err.message
          : "Quick Fill failed after retrying content generation.",
      );
    } finally {
      setIsQuickFilling(false);
    }
  }

  function handleQuickFill() {
    if (blocks.length > 0) {
      setShowQuickFillConfirm(true);
      return;
    }
    void prepareAndApplyQuickFill();
  }

  async function handleViewMore(topic: Topic, questionType: QuestionType) {
    const cached = generatedContent[questionType.id];
    if (!cached) return;
    setLoadingMoreId(questionType.id);
    setError(null);
    try {
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicName: topic.name,
          questionTypeName: questionType.name,
          sourceExcerpt: topic.sourceExcerpt,
          sourceFileNames: files.map((f) => f.name),
          existingContent: cached,
        }),
      });
      const data = (await res.json()) as GeneratedContent & { error?: string };
      if (data.error) throw new Error(data.error);
      appendGeneratedContentStore(questionType.id, data);
    } catch {
      setError({
        questionTypeId: questionType.id,
        message: "Could not fetch more content for this question type.",
      });
    } finally {
      setLoadingMoreId(null);
    }
  }

  async function handleDoQuestionnaire(topic: Topic, questionType: QuestionType) {
    setPendingTarget({ topicId: topic.id, questionTypeId: questionType.id });
    setGeneratingQuestionnaireId(questionType.id);
    setError(null);
    openIds(setOpenTopicIds, [topic.id]);
    openIds(setOpenQuestionTypeIds, [questionType.id]);
    try {
      const res = await fetch("/api/generate-questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicName: topic.name,
          questionTypeName: questionType.name,
          sourceExcerpt: topic.sourceExcerpt,
        }),
      });
      const data = (await res.json()) as { questions?: QuestionnaireQuestion[]; error?: string };
      if (data.error || !data.questions) throw new Error(data.error ?? "Failed");
      setQuestionnaire(data.questions);
    } catch {
      setError({
        questionTypeId: questionType.id,
        message: "Could not generate the questionnaire — try Skip instead.",
      });
    } finally {
      setGeneratingQuestionnaireId(null);
    }
  }

  function resolvePendingTarget() {
    if (!pendingTarget) return null;
    const topic = topics.find((t) => t.id === pendingTarget.topicId);
    const questionType = topic?.questionTypes.find((qt) => qt.id === pendingTarget.questionTypeId);
    if (!topic || !questionType) return null;
    return { topic, questionType };
  }

  function handleQuestionnaireSubmit(answers: QuestionnaireAnswer[]) {
    const target = resolvePendingTarget();
    if (!target) return;
    setQuestionnaireAnswersStore(target.questionType.id, answers);
    setQuizAnswers(answers);
  }

  function closeQuestionnaireModal() {
    setQuestionnaire(null);
    setQuizAnswers(null);
  }

  async function handleResultsContinue() {
    const target = resolvePendingTarget();
    const answers = quizAnswers ?? undefined;
    closeQuestionnaireModal();
    if (!target) return;
    await generateContent(target.topic, target.questionType, answers);
  }

  async function handleQuestionnaireSkip() {
    const target = resolvePendingTarget();
    closeQuestionnaireModal();
    if (!target) return;
    await generateContent(target.topic, target.questionType, undefined);
  }

  const ranked = [...topics].sort((a, b) => b.frequencyScore - a.frequencyScore);
  const canSkipAll = ranked.some((topic) =>
    topic.questionTypes.some((qt) => !generatedContent[qt.id]),
  );
  const sourcesContent = sourcesQuestionTypeId
    ? generatedContent[sourcesQuestionTypeId]
    : undefined;

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
          isGenerating={
            pendingTarget ? generatingContentIds.has(pendingTarget.questionTypeId) : false
          }
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

  return (
    <>
      <aside className="flex w-72 shrink-0 flex-col gap-2 overflow-y-auto border-l border-grey-light px-4 py-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-xs uppercase tracking-wide text-grey">
            Topic cluster — by exam frequency
          </h2>
          {(canSkipAll || skippingAll) && (
            <button
              type="button"
              onClick={handleSkipAll}
              disabled={skippingAll}
              title="Generate content for every question type across all topics, skipping questionnaires"
              className="shrink-0 border border-grey-light px-2 py-0.5 text-xs text-grey hover:border-uq-purple hover:text-uq-purple disabled:opacity-40"
            >
              {skippingAll ? "..." : "Skip all"}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleQuickFill}
          disabled={isQuickFilling}
          title="Arrange all analysed content on the canvas by exam frequency"
          className="mb-1 flex w-full items-center justify-center gap-1.5 bg-uq-purple px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        >
          <Sparkles size={13} strokeWidth={1.5} />
          {isQuickFilling ? "Preparing..." : "Quick fill"}
        </button>
        {quickFillMessage ? (
          <p className="mb-1 text-xs text-grey" role="status">
            {quickFillMessage}
          </p>
        ) : null}
        {ranked.map((topic, i) => {
          const topicOpen = openTopicIds.has(topic.id);

          return (
            <div key={topic.id} className="border border-grey-light">
              <button
                type="button"
                aria-expanded={topicOpen}
                onClick={() => toggleSet(setOpenTopicIds, topic.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:text-uq-purple"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {i + 1}. {topic.name}
                  </span>
                  <span className="text-xs text-grey">
                    {topic.questionCount} question{topic.questionCount === 1 ? "" : "s"} ·{" "}
                    {topic.frequencyScore}%
                  </span>
                </span>
                <AccordionChevron open={topicOpen} />
              </button>

              {topicOpen && (
                <div className="divide-y divide-grey-light border-t border-grey-light">
                  {topic.questionTypes.map((questionType) => {
                    const qtOpen = openQuestionTypeIds.has(questionType.id);
                    const content = generatedContent[questionType.id];
                    const isGenerating = generatingContentIds.has(questionType.id);
                    const isPreparingQuiz = generatingQuestionnaireId === questionType.id;
                    const isLoadingMore = loadingMoreId === questionType.id;
                    const qtError =
                      error?.questionTypeId === questionType.id ? error.message : null;
                    const busy = isGenerating || isPreparingQuiz || skippingAll;

                    return (
                      <div key={questionType.id}>
                        <button
                          type="button"
                          aria-expanded={qtOpen}
                          onClick={() => toggleSet(setOpenQuestionTypeIds, questionType.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:text-uq-purple"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{questionType.name}</span>
                            <span className="text-xs text-grey">
                              {questionType.questionCount} question
                              {questionType.questionCount === 1 ? "" : "s"}
                            </span>
                          </span>
                          <AccordionChevron open={qtOpen} />
                        </button>

                        {qtOpen && (
                          <div className="flex flex-col gap-2 px-3 pb-2">
                            {content ? (
                              <>
                                <ContentSection
                                  title="1. Key Theory"
                                  items={content.theory}
                                  idPrefix={`${questionType.id}-theory`}
                                />
                                <ContentSection
                                  title="2. Example Question & Solution"
                                  items={content.sampleExamples}
                                  idPrefix={`${questionType.id}-examples`}
                                />
                                <ContentSection
                                  title="3. Common Errors"
                                  items={content.commonErrors}
                                  idPrefix={`${questionType.id}-errors`}
                                />
                                {qtError && <p className="text-xs text-red-700">{qtError}</p>}
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleViewMore(topic, questionType)}
                                    disabled={isLoadingMore}
                                    className="border border-grey-light px-3 py-1.5 text-sm hover:border-uq-purple disabled:opacity-40"
                                  >
                                    {isLoadingMore ? "Loading..." : "View more"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSourcesQuestionTypeId(questionType.id)}
                                    className="border border-grey-light px-3 py-1.5 text-sm hover:border-uq-purple"
                                  >
                                    Sources
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-xs text-grey">
                                  Answer a short questionnaire so suggestions match what you need,
                                  or skip straight to AI content.
                                </p>
                                {qtError && <p className="text-xs text-red-700">{qtError}</p>}
                                <button
                                  type="button"
                                  onClick={() => handleDoQuestionnaire(topic, questionType)}
                                  disabled={busy}
                                  className="bg-uq-purple px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                                >
                                  {isPreparingQuiz
                                    ? "Preparing questionnaire..."
                                    : "Do questionnaire"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => generateContent(topic, questionType, undefined)}
                                  disabled={busy}
                                  className="border border-grey-light px-3 py-1.5 text-sm hover:border-uq-purple disabled:opacity-40"
                                >
                                  {isGenerating ? "Generating..." : "Skip questionnaire"}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </aside>
      {questionnaireModal}
      {sourcesContent && sourcesQuestionTypeId && (
        <Modal title="Sources" onClose={() => setSourcesQuestionTypeId(null)}>
          <SourcesList sources={sourcesContent.sources} />
        </Modal>
      )}
      {showQuickFillConfirm && (
        <Modal title="Replace the current canvas?" onClose={() => setShowQuickFillConfirm(false)}>
          <p className="mb-4 text-sm text-grey">
            Quick Fill will replace the blocks currently on the canvas with all generated content.
            You can undo this change afterward.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void prepareAndApplyQuickFill()}
              disabled={isQuickFilling}
              className="bg-uq-purple px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {isQuickFilling ? "Preparing..." : "Replace and fill"}
            </button>
            <button
              type="button"
              onClick={() => setShowQuickFillConfirm(false)}
              className="px-4 py-2 text-sm text-grey hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
