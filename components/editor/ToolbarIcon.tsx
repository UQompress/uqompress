"use client";

const ICON_CLASS = "pointer-events-none select-none";

export function ToolbarIcon({
  file,
  alt,
  className,
}: {
  file: string;
  alt: string;
  className?: string;
}) {
  return (
    // Decorative toolbar glyphs from public/Icons — next/image is unnecessary
    // for these tiny SVGs and several filenames contain spaces.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/Icons/${encodeURIComponent(file)}`}
      alt={alt}
      draggable={false}
      className={`${ICON_CLASS} ${className ?? ""}`}
    />
  );
}

export function ColorBar({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "block",
        width: 18,
        height: 3,
        backgroundColor: color || "transparent",
        borderRadius: 1,
        WebkitMask: `url("/Icons/${encodeURIComponent("Color Bar.svg")}") no-repeat center / contain`,
        mask: `url("/Icons/${encodeURIComponent("Color Bar.svg")}") no-repeat center / contain`,
        boxShadow: color ? undefined : "inset 0 0 0 1px #e5e5e5",
      }}
    />
  );
}
