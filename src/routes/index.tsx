import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { LogOut, Search, Sparkles, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Column } from "@/components/kanban/Column";
import { TaskCard } from "@/components/kanban/TaskCard";
import { TaskEditSheet } from "@/components/kanban/TaskEditSheet";
import { AIChatPanel } from "@/components/kanban/AIChatPanel";
import { COLUMNS, type Task, type TaskStatus } from "@/lib/task-utils";

export const Route = createFileRoute("/")({
  component: BoardPage,
});

function BoardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("todo");
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("position", { ascending: true });
    if (error) {
      toast.error("Failed to load tasks");
      return;
    }
    setTasks((data ?? []) as Task[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadTasks();
  }, [user, loadTasks]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q),
    );
  }, [tasks, search]);

  const byStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], complete: [] };
    for (const t of filtered) grouped[t.status].push(t);
    return grouped;
  }, [filtered]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeTaskId = String(active.id);
    const activeT = tasks.find((t) => t.id === activeTaskId);
    if (!activeT) return;

    const overData = over.data.current as { type?: string; status?: TaskStatus; task?: Task } | undefined;
    let newStatus: TaskStatus = activeT.status;
    let overIndex = -1;

    if (overData?.type === "column" && overData.status) {
      newStatus = overData.status;
    } else if (overData?.type === "task" && overData.task) {
      newStatus = overData.task.status;
      const targetList = tasks.filter((t) => t.status === newStatus);
      overIndex = targetList.findIndex((t) => t.id === overData.task!.id);
    }

    // Build new ordering for the target column
    let targetList = tasks.filter((t) => t.status === newStatus && t.id !== activeTaskId);
    const moved = { ...activeT, status: newStatus };
    if (overIndex < 0 || overIndex >= targetList.length) targetList.push(moved);
    else targetList = [...targetList.slice(0, overIndex), moved, ...targetList.slice(overIndex)];

    // Reassign positions in the target column
    const positionUpdates: { id: string; position: number; status: TaskStatus }[] = targetList.map(
      (t, i) => ({ id: t.id, position: (i + 1) * 1000, status: newStatus }),
    );

    // Optimistic update
    const otherTasks = tasks.filter((t) => t.status !== newStatus && t.id !== activeTaskId);
    const updatedActive = positionUpdates.find((p) => p.id === activeTaskId)!;
    const newTasks = [
      ...otherTasks,
      ...targetList.map((t) => ({
        ...t,
        position: positionUpdates.find((p) => p.id === t.id)!.position,
        status: newStatus,
      })),
    ];
    setTasks(newTasks);

    // Persist the moved task (status + position) and any positional changes
    try {
      // Update status of the moved task if it changed
      if (activeT.status !== newStatus) {
        await supabase
          .from("tasks")
          .update({ status: newStatus, position: updatedActive.position })
          .eq("id", activeTaskId);
      } else {
        await supabase
          .from("tasks")
          .update({ position: updatedActive.position })
          .eq("id", activeTaskId);
      }
      // Update positions of others in target column (best effort)
      await Promise.all(
        positionUpdates
          .filter((p) => p.id !== activeTaskId)
          .map((p) => supabase.from("tasks").update({ position: p.position }).eq("id", p.id)),
      );
    } catch {
      toast.error("Failed to save move");
      loadTasks();
    }
  }

  function openNew(status: TaskStatus) {
    setEditTask(null);
    setDefaultStatus(status);
    setSheetOpen(true);
  }
  function openEdit(t: Task) {
    setEditTask(t);
    setSheetOpen(true);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border/60 backdrop-blur-md bg-background/80 sticky top-0 z-30">
        <div className="px-4 lg:px-8 h-16 flex items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-orange shadow-glow flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold hidden sm:inline">Flowboard</span>
          </div>

          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="pl-9 bg-surface border-border h-9"
            />
          </div>

          <Button
            onClick={() => setAiOpen(true)}
            variant="ghost"
            className="hidden sm:inline-flex gap-2 text-foreground hover:bg-surface"
          >
            <Sparkles className="h-4 w-4 text-brand-purple" />
            Ask AI
          </Button>

          <Button
            onClick={() => openNew("todo")}
            className="bg-gradient-orange text-primary-foreground hover:opacity-90 font-semibold"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New task</span>
          </Button>

          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Board */}
      <main className="flex-1 px-4 lg:px-8 py-6 overflow-x-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className="flex flex-col lg:flex-row gap-6 min-h-[60vh] pb-6">
              {COLUMNS.map((col) => (
                <Column
                  key={col.id}
                  status={col.id}
                  tasks={byStatus[col.id]}
                  onAdd={() => openNew(col.id)}
                  onTaskClick={openEdit}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} onClick={() => {}} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {/* Floating AI button (mobile) */}
      <button
        onClick={() => setAiOpen(true)}
        className="sm:hidden fixed bottom-5 right-5 z-30 h-14 w-14 rounded-full bg-gradient-purple text-primary-foreground shadow-glow flex items-center justify-center"
        aria-label="Ask AI"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {user && (
        <TaskEditSheet
          open={sheetOpen}
          task={editTask}
          defaultStatus={defaultStatus}
          userId={user.id}
          onClose={() => setSheetOpen(false)}
          onSaved={loadTasks}
        />
      )}

      <AIChatPanel open={aiOpen} onClose={() => setAiOpen(false)} tasks={tasks} />
    </div>
  );
}
