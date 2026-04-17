import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { TaskCard } from "./TaskCard";
import { type Task, type TaskStatus, COLUMNS } from "@/lib/task-utils";
import { cn } from "@/lib/utils";

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onAdd: () => void;
  onTaskClick: (task: Task) => void;
}

export function Column({ status, tasks, onAdd, onTaskClick }: ColumnProps) {
  const meta = COLUMNS.find((c) => c.id === status)!;
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  });

  return (
    <div className="flex flex-col w-full lg:w-[340px] shrink-0">
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", `bg-${meta.accent}`)} />
          <h3 className="font-display font-semibold text-foreground">{meta.title}</h3>
          <span className="rounded-full bg-surface text-muted-foreground text-xs font-medium px-2 py-0.5">
            {tasks.length}
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onAdd}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[120px] rounded-2xl border border-dashed border-border/40 p-3 transition-colors",
          isOver && "border-primary/60 bg-primary/5",
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>

        {tasks.length === 0 && (
          <button
            onClick={onAdd}
            className="w-full text-xs text-muted-foreground py-6 hover:text-foreground transition-colors"
          >
            + Add a task
          </button>
        )}
      </div>
    </div>
  );
}
