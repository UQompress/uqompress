"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { Topic } from "@/lib/types";

const PURPLE = "#51247A";
const GREY = "#d4d4d4";

export function FrequencyChart({
  topics,
  selectedTopicId,
  onSelect,
}: {
  topics: Topic[];
  selectedTopicId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(topics.length * 52, 120)}>
      <BarChart
        data={topics}
        layout="vertical"
        margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
        barCategoryGap={16}
      >
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={220}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#171717" }}
        />
        <Bar
          dataKey="frequencyScore"
          barSize={14}
          radius={0}
          isAnimationActive={false}
          onClick={(data) => onSelect(data.id as string)}
          cursor="pointer"
        >
          {topics.map((topic) => (
            <Cell
              key={topic.id}
              fill={topic.id === selectedTopicId ? PURPLE : GREY}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
