export async function exportPagesToPdf(
  pageIndexes: number[],
  filename: string,
  orientation: "portrait" | "landscape" = "portrait",
) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const guides = Array.from(
    document.querySelectorAll<HTMLElement>("[data-cheat-sheet-grid-guide]"),
  );
  const previousDisplay = guides.map((el) => el.style.display);
  for (const el of guides) el.style.display = "none";

  try {
    let wrotePage = false;
    for (const pageIndex of pageIndexes) {
      const element = document.getElementById(`cheat-sheet-page-${pageIndex}`);
      if (!element) throw new Error(`Cheat sheet page ${pageIndex + 1} not found.`);

      // scale:2 is raster resolution only. The image is mapped 1:1 onto A4,
      // and the on-screen page is sized in CSS px equal to PostScript points
      // (595×842), so a 12px body block exports as 12pt.
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");

      if (wrotePage) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
      wrotePage = true;
    }
  } finally {
    guides.forEach((el, i) => {
      el.style.display = previousDisplay[i];
    });
  }

  pdf.save(filename);
}
