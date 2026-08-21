export async function exportPageToPdf(elementId: string, filename: string) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const element = document.getElementById(elementId);
  if (!element) throw new Error("Cheat sheet page not found.");

  // Hide the snap-to-grid guide (an editing aid, not part of the cheat sheet)
  // for the duration of the capture.
  const previousBackgroundImage = element.style.backgroundImage;
  element.style.backgroundImage = "none";

  let imgData: string;
  try {
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff" });
    imgData = canvas.toDataURL("image/png");
  } finally {
    element.style.backgroundImage = previousBackgroundImage;
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
  pdf.save(filename);
}
