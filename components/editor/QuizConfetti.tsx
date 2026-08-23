"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

const COLORS = ["#51247a", "#e879a9", "#f5c518", "#22c55e", "#3b82f6", "#f97316", "#ec4899"];

type Piece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  width: number;
  height: number;
  wobble: number;
};

function makePieces(count = 72): Piece[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: Math.random() * 100,
    delay: Math.random() * 0.45,
    duration: 1.35 + Math.random() * 0.9,
    color: COLORS[id % COLORS.length]!,
    width: 4 + Math.random() * 3,
    height: 3 + Math.random() * 4,
    wobble: 10 + Math.random() * 18,
  }));
}

export function QuizConfetti() {
  const pieces = useMemo(() => makePieces(), []);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), 3800);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="quiz-confetti-piece absolute top-0"
          style={
            {
              left: `${piece.left}%`,
              width: piece.width,
              height: piece.height,
              background: piece.color,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              "--wobble": `${piece.wobble}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
