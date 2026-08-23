import { getImageTranscription } from "@/lib/ai-client";

export async function POST(request: Request) {
  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return Response.json({ error: "No image provided." }, { status: 400 });
  }

  const arrayBuffer = await image.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mediaType = image.type || "image/png";

  try {
    const text = await getImageTranscription(base64, mediaType);
    if (text === null) {
      return Response.json(
        { error: "No AI provider configured for image transcription." },
        { status: 503 },
      );
    }
    return Response.json({ text: text.trim() });
  } catch (err) {
    console.error("OCR failed", err);
    return Response.json({ error: "Could not read text from this image." }, { status: 502 });
  }
}
