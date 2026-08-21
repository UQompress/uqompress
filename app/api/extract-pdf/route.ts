import { PDFParse } from "pdf-parse";
import type { ExtractedFile } from "@/lib/types";

export async function POST(request: Request) {
  const formData = await request.formData();
  const uploads = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (uploads.length === 0) {
    return Response.json({ error: "No files provided." }, { status: 400 });
  }

  const results: ExtractedFile[] = [];

  for (const file of uploads) {
    const arrayBuffer = await file.arrayBuffer();
    const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
    try {
      const result = await parser.getText();
      results.push({ name: file.name, text: result.text });
    } finally {
      await parser.destroy();
    }
  }

  return Response.json({ files: results });
}
