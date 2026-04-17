import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, X, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { type Task } from "@/lib/task-utils";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

interface Props {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
}

export function AIChatPanel({ open, onClose, tasks }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const append = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: next, tasks }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Too many requests. Try again in a moment.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add credits in Settings.");
        else toast.error("AI request failed");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;

      while (!done) {
        const r = await reader.read();
        if (r.done) break;
        buf += decoder.decode(r.value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) append(content);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("AI request failed");
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    "What's overdue?",
    "Summarize what's in progress",
    "What should I prioritize today?",
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] bg-background border-l border-border flex flex-col"
          >
            <header className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-purple flex items-center justify-center shadow-glow">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-sm">Board Assistant</h3>
                  <p className="text-xs text-muted-foreground">Knows {tasks.length} tasks</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-gradient-purple p-4 text-primary-foreground">
                    <p className="text-sm font-medium">
                      Hi! Ask me anything about your tasks. I can summarize, find what's overdue, or help you prioritize.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Try</p>
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="block w-full text-left text-sm bg-surface hover:bg-surface-elevated rounded-xl px-3 py-2 border border-border transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 max-w-[85%] text-sm prose prose-sm prose-invert",
                      m.role === "user"
                        ? "bg-gradient-orange text-primary-foreground"
                        : "bg-surface text-foreground",
                    )}
                  >
                    {m.role === "assistant" ? (
                      <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                    ) : (
                      <p className="m-0">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {loading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-surface rounded-2xl px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <div className="relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Ask about your board…"
                  className="resize-none min-h-[52px] pr-12 bg-surface border-border"
                  rows={2}
                />
                <Button
                  size="icon"
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="absolute right-2 bottom-2 h-8 w-8 bg-gradient-orange text-primary-foreground hover:opacity-90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
