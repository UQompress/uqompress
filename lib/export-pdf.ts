const PDF_EXPORT_DPI = 300;
const A4_CSS_DPI = 72;
const PDF_EXPORT_SCALE = PDF_EXPORT_DPI / A4_CSS_DPI;

async function waitForEditorPaint() {
  if (document.fonts?.ready) await document.fonts.ready;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(async (image) => {
      if (image.complete) return;
      try {
        await image.decode();
      } catch {
        // html2canvas will render the image's current browser state.
      }
    }),
  );
}

function createUnscaledPageClone(source: HTMLElement) {
  const width = source.offsetWidth;
  const height = source.offsetHeight;
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${width}px`,
    height: `${height}px`,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: "-2147483648",
    background: "#ffffff",
    transform: "none",
  });

  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  Object.assign(clone.style, {
    position: "relative",
    left: "0",
    top: "0",
    width: `${width}px`,
    height: `${height}px`,
    transform: "none",
    transformOrigin: "top left",
  });
  clone
    .querySelectorAll<HTMLElement>("[data-cheat-sheet-grid-guide], [data-ink-draw-layer]")
    .forEach((editorOnlyLayer) => {
      editorOnlyLayer.style.display = "none";
    });
  clone.querySelectorAll<HTMLElement>("[contenteditable]").forEach((editable) => {
    editable.contentEditable = "false";
  });

  host.appendChild(clone);
  document.body.appendChild(host);
  return { clone, host, width, height };
}

export async function exportPagesToPdf(
  pageIndexes: number[],
  filename: string,
  orientation: "portrait" | "landscape" = "portrait",
) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Selection changes and loaded web fonts must reach the DOM before cloning.
  // Capturing an isolated clone prevents the editor's visual zoom transform
  // from changing text metrics relative to the fixed-size canvas blocks.
  await waitForEditorPaint();

  let wrotePage = false;
  for (const pageIndex of pageIndexes) {
    const element = document.getElementById(`cheat-sheet-page-${pageIndex}`);
    if (!element) throw new Error(`Cheat sheet page ${pageIndex + 1} not found.`);

    const { clone, host, width, height } = createUnscaledPageClone(element);
    try {
      await waitForImages(clone);
      // The editor's 595 x 842 CSS-pixel canvas maps to A4 at 72 DPI. Capture
      // at 300 DPI so small text remains sharp when viewed or printed.
      const canvas = await html2canvas(clone, {
        scale: PDF_EXPORT_SCALE,
        width,
        height,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");

      if (wrotePage) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
      wrotePage = true;
    } finally {
      host.remove();
    }
  }

  pdf.save(filename);
}
