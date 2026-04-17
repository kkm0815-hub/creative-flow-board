import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import { Calendar, Flag } from "lucide-react";
import {
  type Task,
  PRIORITY_META,
  formatDueDate,
  getLabelMeta,
} from "@/lib/task-utils";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isOverlay?: boolean;
}

export function TaskCard({ task, onClick, isOverlay }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task },
  });

  const label = getLabelMeta(task.label_color);
  const due = formatDueDate(task.due_date);
  const priority = PRIORITY_META[task.priority];
  const isHigh = task.priority === "high";
  const isComplete = task.status === "complete";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      layout
      whileHover={{ y: -2 }}
      className={cn(
        "group relative cursor-grab active:cursor-grabbing select-none rounded-2xl p-4 shadow-card transition-all",
        "border border-border/60 hover:border-border",
        isHigh && !isComplete
          ? `${label.gradient} text-primary-foreground border-transparent shadow-glow`
          : "bg-card",
        isOverlay && "rotate-2 shadow-glow",
        isComplete && "opacity-70",
      )}
    >
      {/* Left accent bar (only on default cards) */}
      {!isHigh || isComplete ? (
        <div className={cn("absolute left-0 top-3 bottom-3 w-1 rounded-r-full", label.ring)} />
      ) : null}

      <div className="flex items-start justify-between gap-2 mb-2">
        <h4
          className={cn(
            "font-semibold text-sm leading-snug",
            isHigh && !isComplete ? "text-primary-foreground" : "text-foreground",
            isComplete && "line-through opacity-80",
          )}
        >
          {task.title}
        </h4>
      </div>

      {task.description && (
        <p
          className={cn(
            "text-xs line-clamp-2 mb-3",
            isHigh && !isComplete ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              isHigh && !isComplete
                ? "bg-white/15 text-white border-white/20"
                : priority.className,
            )}
          >
            <Flag className="h-2.5 w-2.5" />
            {priority.label}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
              isHigh && !isComplete ? "bg-white/15 text-white" : label.chip,
            )}
          >
            {task.label_color}
          </span>
        </div>

        {due && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium",
              isHigh && !isComplete && "text-primary-foreground/90",
              !isHigh && due.tone === "overdue" && "text-destructive",
              !isHigh && due.tone === "soon" && "text-brand-orange",
              !isHigh && due.tone === "default" && "text-muted-foreground",
            )}
          >
            <Calendar className="h-3 w-3" />
            {due.text}
          </span>
        )}
      </div>
    </motion.div>
  );
}
