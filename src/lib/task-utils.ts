import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";

export type TaskStatus = "todo" | "in_progress" | "complete";
export type TaskPriority = "low" | "medium" | "high";
export type LabelColor = "orange" | "purple" | "green" | "blue" | "pink" | "yellow";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  label_color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export const COLUMNS: { id: TaskStatus; title: string; accent: string }[] = [
  { id: "todo", title: "To-do", accent: "brand-blue" },
  { id: "in_progress", title: "In Progress", accent: "brand-orange" },
  { id: "complete", title: "Complete", accent: "brand-green" },
];

export const PRIORITY_META: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-brand-green/15 text-brand-green border-brand-green/30" },
  medium: { label: "Medium", className: "bg-brand-yellow/15 text-brand-yellow border-brand-yellow/30" },
  high: { label: "High", className: "bg-brand-pink/15 text-brand-pink border-brand-pink/40" },
};

export const LABEL_COLORS: { value: LabelColor; gradient: string; chip: string; ring: string }[] = [
  { value: "orange", gradient: "bg-gradient-orange", chip: "bg-brand-orange/15 text-brand-orange", ring: "bg-brand-orange" },
  { value: "purple", gradient: "bg-gradient-purple", chip: "bg-brand-purple/15 text-brand-purple", ring: "bg-brand-purple" },
  { value: "green", gradient: "bg-gradient-green", chip: "bg-brand-green/15 text-brand-green", ring: "bg-brand-green" },
  { value: "blue", gradient: "bg-gradient-blue", chip: "bg-brand-blue/15 text-brand-blue", ring: "bg-brand-blue" },
  { value: "pink", gradient: "bg-gradient-pink", chip: "bg-brand-pink/15 text-brand-pink", ring: "bg-brand-pink" },
  { value: "yellow", gradient: "bg-gradient-orange", chip: "bg-brand-yellow/15 text-brand-yellow", ring: "bg-brand-yellow" },
];

export function getLabelMeta(color: string) {
  return LABEL_COLORS.find((c) => c.value === color) ?? LABEL_COLORS[3];
}

export function formatDueDate(due: string | null): { text: string; tone: "default" | "soon" | "overdue" | "done" } | null {
  if (!due) return null;
  const date = parseISO(due);
  if (!isValid(date)) return null;
  const diff = differenceInCalendarDays(date, new Date());
  if (diff < 0) return { text: `Overdue ${format(date, "MMM d")}`, tone: "overdue" };
  if (diff === 0) return { text: "Due today", tone: "soon" };
  if (diff === 1) return { text: "Due tomorrow", tone: "soon" };
  if (diff <= 3) return { text: `Due in ${diff} days`, tone: "soon" };
  return { text: format(date, "MMM d"), tone: "default" };
}
