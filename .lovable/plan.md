
# Kanban Board — Plan

## What we're building
A personal, login-protected Kanban board with three columns (**To-do**, **In Progress**, **Complete**), a beautiful dark UI inspired by your reference images, and an AI assistant that knows your board.

## Pages & flow
1. **`/auth`** — Email + password sign up / sign in (clean split-screen, dark)
2. **`/` (Board)** — Main protected Kanban experience
   - Top bar: workspace name, search, profile menu (sign out), "Ask AI" toggle
   - Three columns side-by-side with task counts and a "+ Add task" button per column
   - Drag-and-drop between columns + reorder within a column (smooth animations)
   - Click a card → slide-over panel to edit details
   - AI chat panel slides in from the right

## Task card (Standard set)
Each card shows: title, short description preview, **priority** chip (Low / Medium / High with color), **due date** (with "Due in X days" / "Overdue" coloring), and a **color label tag**.

Add/Edit form fields: Title · Description · Status · Priority · Due date · Label color.

## Visual design (mix of both references)
- Deep dark background (`oklch` near-black with subtle warmth)
- Default cards = subtle dark surface with colored left accent + label chip
- **High-priority** or selected cards get the bold vibrant treatment (orange, purple, green, blue gradients) like reference 1
- Rounded-2xl cards, soft shadows, subtle hover lift, smooth column reorder animations (Framer Motion)
- Colored tag chips like reference 2 for labels
- Custom design tokens (not default shadcn) — proper semantic palette in `index.css`

## Interactivity
- Drag-and-drop with `@dnd-kit` (smooth, accessible)
- Card hover lift, column drop highlights
- Optimistic updates so moves feel instant
- Empty-state illustrations per column
- Toast confirmations for create/delete

## AI Assistant (Board-aware Q&A)
- Floating button bottom-right; opens a right-side chat panel
- Powered by Lovable AI (Gemini, free during promo) via a secure server function
- Each request sends your **current task list** as context so it can answer:
  - "What's overdue?" · "Summarize what's in progress" · "What should I prioritize today?" · "How many high-priority tasks do I have?"
- Streaming responses, markdown rendering, conversation kept in-session

## Backend (Lovable Cloud)
- **Auth**: email/password (no email confirmation needed for fast testing)
- **Tables**:
  - `profiles` (id, display_name) — auto-created on signup via trigger
  - `tasks` (id, user_id, title, description, status, priority, due_date, label_color, position, timestamps)
- **RLS**: users can only see/edit their own tasks
- **Server function**: `chat-with-board` — takes user message + tasks, calls Lovable AI, streams reply

## Out of scope (can add later)
Subtasks/checklists, assignees, multiple boards, sharing, file attachments, recurring tasks, calendar view.
