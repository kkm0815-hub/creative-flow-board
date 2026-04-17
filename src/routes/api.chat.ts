import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "AI not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: { messages?: { role: string; content: string }[]; tasks?: unknown[] };
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
        }

        const messages = Array.isArray(body.messages) ? body.messages : [];
        const tasks = Array.isArray(body.tasks) ? body.tasks : [];

        const compactTasks = tasks
          .map((t) => {
            const task = t as Record<string, unknown>;
            return {
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              due_date: task.due_date,
              label: task.label_color,
            };
          })
          .slice(0, 200);

        const today = new Date().toISOString().split("T")[0];

        const systemPrompt = `You are a helpful assistant for a personal Kanban board called Flowboard.
Today is ${today}.
You can see the user's current tasks (provided below as JSON). Statuses are: todo, in_progress, complete.
Help the user understand, summarize, and prioritize their work.
Be concise, friendly, and use markdown (lists, bold) when helpful.
If asked about tasks, ground answers strictly in the provided data — don't invent tasks.

Current tasks (${compactTasks.length} total):
${JSON.stringify(compactTasks, null, 2)}`;

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            stream: true,
            messages: [
              { role: "system", content: systemPrompt },
              ...messages.map((m) => ({ role: m.role, content: m.content })),
            ],
          }),
        });

        if (!upstream.ok) {
          if (upstream.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 });
          }
          if (upstream.status === 402) {
            return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402 });
          }
          const t = await upstream.text();
          console.error("AI gateway error:", upstream.status, t);
          return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500 });
        }

        return new Response(upstream.body, {
          headers: { "Content-Type": "text/event-stream" },
        });
      },
    },
  },
});
