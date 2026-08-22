"use client";

import { useState } from "react";
import { Check, TriangleAlert, X } from "lucide-react";
import type { QuestionnaireAnswer, QuestionnaireQuestion } from "@/lib/types";

export function Questionnaire({
  questions,
  onSubmit,
  onCancel,
  onSkip,
}: {
  questions: QuestionnaireQuestion[];
  onSubmit: (answers: QuestionnaireAnswer[]) => void;
  onCancel: () => void;
  onSkip: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const question = questions[index];
  const selected = answers[question.id];
  const isAnswered = Boolean(selected);
  const isCorrect = selected === question.correctAnswer;
  const isLast = index === questions.length - 1;
  const correctCount = Object.entries(answers).filter(
    ([qId, ans]) => questions.find((q) => q.id === qId)?.correctAnswer === ans,
  ).length;

  function selectOption(option: string) {
    if (isAnswered) return;
    setAnswers((prev) => ({ ...prev, [question.id]: option }));
  }

  function handleNext() {
    if (isLast) {
      onSubmit(questions.map((q) => ({ questionId: q.id, answer: answers[q.id] })));
      return;
    }
    setIndex((i) => i + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-2 border border-grey-light px-3 py-2 text-xs text-grey">
        <TriangleAlert size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
        <span>
          These questions are AI-generated and might occasionally be wrong — use your own
          judgement too.
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-grey">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        {Object.keys(answers).length > 0 && (
          <span>
            {correctCount}/{Object.keys(answers).length} correct so far
          </span>
        )}
      </div>

      <p className="text-base font-medium">{question.question}</p>

      <div className="flex flex-col gap-2">
        {question.options.map((option) => {
          const isSelectedOption = option === selected;
          const isCorrectOption = option === question.correctAnswer;

          let stateClasses = "border-grey-light hover:border-uq-purple";
          if (isAnswered && isCorrectOption) {
            stateClasses = "border-green-600 bg-green-50";
          } else if (isAnswered && isSelectedOption && !isCorrectOption) {
            stateClasses = "border-red-600 bg-red-50";
          }

          return (
            <button
              key={option}
              type="button"
              onClick={() => selectOption(option)}
              disabled={isAnswered}
              className={`flex items-center justify-between gap-2 border px-3 py-2.5 text-left text-sm ${stateClasses} ${isAnswered ? "" : "cursor-pointer"}`}
            >
              <span>{option}</span>
              {isAnswered && isCorrectOption && (
                <Check size={16} strokeWidth={2} style={{ color: "#16a34a" }} />
              )}
              {isAnswered && isSelectedOption && !isCorrectOption && (
                <X size={16} strokeWidth={2} style={{ color: "#dc2626" }} />
              )}
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <div
          className={`border px-3 py-2.5 text-sm ${isCorrect ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50"}`}
        >
          <p className="font-medium">{isCorrect ? "Correct!" : "Not quite."}</p>
          <p className="mt-1 text-grey">{question.explanation}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-grey hover:text-foreground"
        >
          Cancel
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="border border-grey-light px-4 py-2 text-sm hover:border-uq-purple"
          >
            Skip questionnaire
          </button>
          <button
            type="button"
            disabled={!isAnswered}
            onClick={handleNext}
            className="bg-uq-purple px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {isLast ? "Finish" : "Next question"}
          </button>
        </div>
      </div>
    </div>
  );
}
