import type { Topic } from "./types";

// Hardcoded stand-in for the Anthropic analysis response, used so the setup
// and dashboard flow is demoable before the real API + PDF upload are wired in.
export const MOCK_TOPICS: Topic[] = [
  {
    id: "topic-1",
    name: "Big-O complexity analysis",
    frequencyScore: 92,
    rationale:
      "Appears in every past paper, usually as the first question, and is a prerequisite for the sorting and graph questions.",
    sourceExcerpt:
      "Q1 (2023, 2022, 2021): 'State the time complexity of the following algorithm and justify your answer.'",
  },
  {
    id: "topic-2",
    name: "Binary search trees — insertion and deletion",
    frequencyScore: 78,
    rationale:
      "Tested in 3 of the last 4 papers, often paired with a tree-drawing question worth 10+ marks.",
    sourceExcerpt:
      "Q4 (2023): 'Insert the following keys into an empty BST, then delete node 42. Draw the tree after each step.'",
  },
  {
    id: "topic-3",
    name: "Dynamic programming — memoisation",
    frequencyScore: 65,
    rationale:
      "Recurring in the final exam specifically, not the midsem — lecture 9 covers this directly.",
    sourceExcerpt:
      "Q6 (2022): 'Write a memoised recurrence for the longest common subsequence problem.'",
  },
  {
    id: "topic-4",
    name: "Graph traversal — BFS vs DFS",
    frequencyScore: 58,
    rationale:
      "Consistently a short-answer question comparing the two, rarely a full implementation question.",
    sourceExcerpt:
      "Q3 (2023, 2021): 'Compare BFS and DFS in terms of space complexity and use case.'",
  },
  {
    id: "topic-5",
    name: "Hash tables — collision resolution",
    frequencyScore: 41,
    rationale:
      "Appeared once in the last 4 papers, but lecture slides devote 2 full weeks to it.",
    sourceExcerpt:
      "Q7 (2021): 'Explain open addressing vs chaining and give one advantage of each.'",
  },
];
