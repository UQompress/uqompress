export async function exportPagesToPdf(
  pageCount: number,
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

  for (let i = 0; i < pageCount; i++) {
    const element = document.getElementById(`cheat-sheet-page-${i}`);
    if (!element) throw new Error(`Cheat sheet page ${i} not found.`);

    const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");

    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
  }

  pdf.save(filename);
}
