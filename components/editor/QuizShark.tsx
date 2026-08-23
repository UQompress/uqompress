"use client";

export type QuizSharkMood = "neutral" | "correct" | "incorrect" | "complete";

export const SHARK_HAPPY_SRC = "/shark/shark-happy.gif";
export const SHARK_NEUTRAL_SRC = "/shark/shark-neutral.gif";
export const SHARK_SAD_SRC = "/shark/shark-sad.gif";

const MOOD = {
  neutral: { src: SHARK_NEUTRAL_SRC, alt: "Sharky waiting", line: "Let's learn!" },
  correct: { src: SHARK_HAPPY_SRC, alt: "Sharky celebrating", line: "Yay!" },
  incorrect: { src: SHARK_SAD_SRC, alt: "Sharky encouraging you", line: "Try again!" },
  complete: { src: SHARK_HAPPY_SRC, alt: "Sharky celebrating", line: "Yay!" },
} as const;

export function QuizShark({ mood }: { mood: QuizSharkMood }) {
  const { src, alt, line } = MOOD[mood];

  return (
    <div className="flex w-36 flex-col items-center" aria-live="polite">
      <div className="relative mb-2 rounded-2xl bg-white px-3 py-1.5 text-center text-sm font-medium text-uq-purple shadow-sm">
        {line}
        <span
          aria-hidden
          className="absolute left-1/2 top-full -translate-x-1/2 border-8 border-transparent border-t-white"
        />
      </div>
      <img
        key={src}
        src={src}
        alt={alt}
        width={144}
        height={144}
        className="h-36 w-36 object-contain"
      />
    </div>
  );
}
