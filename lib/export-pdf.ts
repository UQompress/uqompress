export async function exportPageToPdf(
  elementId: string,
  filename: string,
  orientation: "portrait" | "landscape" = "portrait",
) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const element = document.getElementById(elementId);
  if (!element) throw new Error("Cheat sheet page not found.");

  // Hide the snap-to-grid dot guide and the rows/columns layout guide (both
  // editing aids, not part of the cheat sheet) for the duration of the capture.
  const previousBackgroundImage = element.style.backgroundImage;
  element.style.backgroundImage = "none";
  const gridGuide = element.querySelector<HTMLElement>("[data-cheat-sheet-grid-guide]");
  const previousGridGuideDisplay = gridGuide?.style.display;
  if (gridGuide) gridGuide.style.display = "none";

  let imgData: string;
  try {
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff" });
    imgData = canvas.toDataURL("image/png");
  } finally {
    element.style.backgroundImage = previousBackgroundImage;
    if (gridGuide) gridGuide.style.display = previousGridGuideDisplay ?? "";
  }

  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
  pdf.save(filename);
}
