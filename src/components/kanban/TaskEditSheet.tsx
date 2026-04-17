import { useEffect, useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  type Task,
  type TaskPriority,
  type TaskStatus,
  COLUMNS,
  LABEL_COLORS,
  PRIORITY_META,
} from "@/lib/task-utils";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  task: Task | null;
  defaultStatus?: TaskStatus;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function TaskEditSheet({ open, task, defaultStatus, userId, onClose, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [labelColor, setLabelColor] = useState("blue");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.due_date ?? "");
      setLabelColor(task.label_color);
    } else {
      setTitle("");
      setDescription("");
      setStatus(defaultStatus ?? "todo");
      setPriority("medium");
      setDueDate("");
      setLabelColor("blue");
    }
  }, [task, defaultStatus, open]);

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      if (task) {
        const { error } = await supabase
          .from("tasks")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            status,
            priority,
            due_date: dueDate || null,
            label_color: labelColor,
          })
          .eq("id", task.id);
        if (error) throw error;
        toast.success("Task updated");
      } else {
        const { error } = await supabase.from("tasks").insert({
          user_id: userId,
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          due_date: dueDate || null,
          label_color: labelColor,
          position: Date.now(),
        });
        if (error) throw error;
        toast.success("Task created");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    if (!confirm("Delete this task?")) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;
      toast.success("Task deleted");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="bg-background border-l-border sm:max-w-md w-full flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-display">{task ? "Edit task" : "New task"}</SheetTitle>
          <SheetDescription className="sr-only">Manage task details</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-5 mt-4 pr-1">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
              className="bg-surface border-border"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more detail…"
              className="min-h-[100px] bg-surface border-border"
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <div className="grid grid-cols-3 gap-2">
              {COLUMNS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setStatus(c.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-medium transition-all",
                    status === c.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-medium transition-all capitalize",
                    priority === p
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground",
                  )}
                >
                  {PRIORITY_META[p].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-surface border-border"
            />
          </div>

          <div className="space-y-2">
            <Label>Label color</Label>
            <div className="flex flex-wrap gap-2">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setLabelColor(c.value)}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 transition-all",
                    c.ring,
                    labelColor === c.value ? "border-foreground scale-110" : "border-transparent",
                  )}
                  aria-label={c.value}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-4 border-t border-border">
          {task ? (
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={saving}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-orange text-primary-foreground font-semibold hover:opacity-90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : task ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
