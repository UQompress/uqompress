import { lookupLearningOutcomes } from "@/lib/uq-course-profile";

export async function POST(request: Request) {
  const { courseCode } = (await request.json()) as { courseCode?: string };

  if (!courseCode) {
    return Response.json({ error: "Missing course code." }, { status: 400 });
  }

  const result = await lookupLearningOutcomes(courseCode);
  if ("error" in result) {
    return Response.json(result, { status: 404 });
  }
  return Response.json(result);
}
