"use client";

import type { QuestionnaireAnswer, QuestionnaireQuestion } from "@/lib/types";
import { QuizConfetti } from "./QuizConfetti";

export function QuestionnaireResults({
  questions,
  answers,
  onContinue,
  isGenerating,
}: {
  questions: QuestionnaireQuestion[];
  answers: QuestionnaireAnswer[];
  onContinue: () => void;
  isGenerating: boolean;
}) {
  const answerByQuestionId = new Map(answers.map((a) => [a.questionId, a.answer]));
  const results = questions.map((q) => ({
    question: q,
    given: answerByQuestionId.get(q.id) ?? "",
    isCorrect: answerByQuestionId.get(q.id) === q.correctAnswer,
  }));
  const correctCount = results.filter((r) => r.isCorrect).length;
  const total = results.length;
  const wrong = results.filter((r) => !r.isCorrect);
  const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <QuizConfetti />
      <div>
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-medium">Your score</h3>
          <span className="text-sm text-grey">
            {correctCount}/{total} correct
          </span>
        </div>
        <div className="mt-2 h-2 w-full bg-grey-light">
          <div className="h-2 bg-uq-purple" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {wrong.length === 0 ? (
        <p className="text-sm text-grey">
          Nice — you got everything right. We&apos;ll still tailor your cheat sheet content
          to this question type.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs uppercase tracking-wide text-grey">
            What to focus your revision on
          </h3>
          {wrong.map((r) => (
            <div key={r.question.id} className="border border-grey-light px-3 py-2.5 text-sm">
              <p className="font-medium">{r.question.question}</p>
              <p className="mt-1 text-grey">
                You answered: <span className="text-foreground">{r.given || "(skipped)"}</span>
              </p>
              <p className="text-grey">
                Correct answer: <span className="text-foreground">{r.question.correctAnswer}</span>
              </p>
              <p className="mt-1 text-grey">{r.question.explanation}</p>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={isGenerating}
        className="self-start bg-uq-purple px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {isGenerating ? "Generating..." : "Generate my cheat sheet content"}
      </button>
    </div>
  );
}
