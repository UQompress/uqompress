import type { GeneratedContent, QuestionnaireQuestion, Topic } from "./types";

// Hardcoded stand-in for the AI analysis response, used so the app stays
// demoable before real course PDFs + an AI provider are wired in.
// frequencyScore = round(100 * questionCount / MOCK_TOTAL_QUESTIONS).
export const MOCK_TOTAL_QUESTIONS = 24;

export const MOCK_TOPICS: Topic[] = [
  {
    id: "topic-1",
    name: "Big-O complexity analysis",
    questionCount: 7,
    frequencyScore: 29,
    rationale:
      "Appears in every past paper, usually as the first question, and is a prerequisite for the sorting and graph questions.",
    sourceExcerpt:
      "Q1 (2023, 2022, 2021): 'State the time complexity of the following algorithm and justify your answer.'",
    questionTypes: [
      { id: "topic-1-qt-1", name: "State and justify a given algorithm's complexity", questionCount: 4 },
      { id: "topic-1-qt-2", name: "Compare complexity of two algorithms", questionCount: 3 },
    ],
  },
  {
    id: "topic-2",
    name: "Binary search trees — insertion and deletion",
    questionCount: 6,
    frequencyScore: 25,
    rationale:
      "Tested in 3 of the last 4 papers, often paired with a tree-drawing question worth 10+ marks.",
    sourceExcerpt:
      "Q4 (2023): 'Insert the following keys into an empty BST, then delete node 42. Draw the tree after each step.'",
    questionTypes: [
      { id: "topic-2-qt-1", name: "Insert keys and draw the resulting tree", questionCount: 3 },
      { id: "topic-2-qt-2", name: "Delete a node and show rebalancing", questionCount: 3 },
    ],
  },
  {
    id: "topic-3",
    name: "Dynamic programming — memoisation",
    questionCount: 5,
    frequencyScore: 21,
    rationale:
      "Recurring in the final exam specifically, not the midsem — lecture 9 covers this directly.",
    sourceExcerpt:
      "Q6 (2022): 'Write a memoised recurrence for the longest common subsequence problem.'",
    questionTypes: [
      { id: "topic-3-qt-1", name: "Write a memoised recurrence relation", questionCount: 5 },
    ],
  },
  {
    id: "topic-4",
    name: "Graph traversal — BFS vs DFS",
    questionCount: 4,
    frequencyScore: 17,
    rationale:
      "Consistently a short-answer question comparing the two, rarely a full implementation question.",
    sourceExcerpt:
      "Q3 (2023, 2021): 'Compare BFS and DFS in terms of space complexity and use case.'",
    questionTypes: [
      { id: "topic-4-qt-1", name: "Compare BFS and DFS properties", questionCount: 4 },
    ],
  },
  {
    id: "topic-5",
    name: "Hash tables — collision resolution",
    questionCount: 2,
    frequencyScore: 8,
    rationale:
      "Appeared once in the last 4 papers, but lecture slides devote 2 full weeks to it.",
    sourceExcerpt:
      "Q7 (2021): 'Explain open addressing vs chaining and give one advantage of each.'",
    questionTypes: [
      { id: "topic-5-qt-1", name: "Explain a collision resolution strategy", questionCount: 2 },
    ],
  },
];

export const MOCK_QUESTIONNAIRE: QuestionnaireQuestion[] = [
  {
    id: "mq-1",
    question: "Which best describes the core idea behind this question type?",
    options: [
      "Apply a fixed formula with no reasoning required",
      "Identify the underlying structure, then apply the relevant technique",
      "Memorise the answer from a past paper",
      "It cannot be solved without a calculator",
    ],
  },
  {
    id: "mq-2",
    question: "What is the most common mistake students make on this question type?",
    options: [
      "Running out of time",
      "Misreading the question",
      "Skipping a key step or edge case in the method",
      "Using the wrong pen colour",
    ],
  },
  {
    id: "mq-3",
    question: "How confident are you applying the relevant theory from lectures here?",
    options: ["Very confident", "Somewhat confident", "Not very confident", "Not at all"],
  },
  {
    id: "mq-4",
    question: "Which resource would help you most on this question type?",
    options: [
      "A worked example",
      "A one-line formula reminder",
      "A list of common mistakes to avoid",
      "I don't need help with this",
    ],
  },
  {
    id: "mq-5",
    question: "When solving this question type under exam conditions, what usually slows you down?",
    options: [
      "Recalling the right method to use",
      "Executing the method without arithmetic/logic errors",
      "Writing a clear justification",
      "Nothing — I'm comfortable with this",
    ],
  },
];

export function mockGeneratedContent(topicName: string, questionTypeName: string): GeneratedContent {
  return {
    theory: [
      `${topicName}: core definition and when it applies (placeholder — no AI provider configured).`,
      `${questionTypeName}: the standard method/steps used to solve this question type.`,
    ],
    sampleExamples: [
      `Worked example for "${questionTypeName}" (placeholder — replace with a real AI-drafted example).`,
    ],
    commonErrors: [
      `Common error on "${questionTypeName}": skipping a step or misapplying the method under time pressure.`,
    ],
  };
}
