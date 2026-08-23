import type { GeneratedContent, Topic } from "./types";

function hasFillableContent(content?: GeneratedContent): content is GeneratedContent {
  return Boolean(
    content &&
      (content.theory.length > 0 ||
        content.sampleExamples.length > 0 ||
        content.commonErrors.length > 0),
  );
}

export async function prepareQuickFillContent({
  topics,
  sourceFileNames,
  existingContent = {},
}: {
  topics: Topic[];
  sourceFileNames: string[];
  existingContent?: Record<string, GeneratedContent>;
}): Promise<Record<string, GeneratedContent>> {
  const jobs = topics.flatMap((topic) =>
    topic.questionTypes.map(async (questionType) => {
      const existing = existingContent[questionType.id];
      if (hasFillableContent(existing)) {
        return [questionType.id, existing] as const;
      }

      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicName: topic.name,
          questionTypeName: questionType.name,
          sourceExcerpt: topic.sourceExcerpt,
          sourceFileNames,
        }),
      });
      const content = (await response.json()) as GeneratedContent & { error?: string };
      if (!response.ok || content.error) {
        throw new Error(content.error ?? "Content generation failed after retrying.");
      }
      return [questionType.id, content] as const;
    }),
  );

  return Object.fromEntries(await Promise.all(jobs));
}
