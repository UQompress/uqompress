"use client";

import { useState } from "react";
import type { QuestionnaireAnswer, QuestionnaireQuestion } from "@/lib/types";

export function Questionnaire({
  questions,
  onSubmit,
  onCancel,
}: {
  questions: QuestionnaireQuestion[];
  onSubmit: (answers: QuestionnaireAnswer[]) => void;
  onCancel: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const allAnswered = questions.every((q) => answers[q.id]);

  return (
    <div className="flex flex-col gap-5">
      {questions.map((q, i) => (
        <div key={q.id} className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {i + 1}. {q.question}
          </p>
          <div className="flex flex-col gap-1">
            {q.options.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === option}
                  onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: option }))}
                  className="accent-uq-purple"
                />
                {option}
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={!allAnswered}
          onClick={() =>
            onSubmit(
              questions.map((q) => ({ questionId: q.id, answer: answers[q.id] })),
            )
          }
          className="bg-uq-purple px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Submit
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-grey hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
