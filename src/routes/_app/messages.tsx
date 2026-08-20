import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { MessageThreadView } from "@/components/MessageThreadView";
import { EmptyState, GlassPanel, SectionLabel } from "@/components/kit";
import { cn } from "@/lib/utils";
import { getTeacherMessageThreads, sendTeacherMessage } from "@/lib/messages.functions";

export const Route = createFileRoute("/_app/messages")({
  loader: () => getTeacherMessageThreads(),
  head: () => ({ meta: [{ title: "Messages · Umwarimu AI" }] }),
  component: TeacherMessages,
});

function TeacherMessages() {
  const threads = Route.useLoaderData();
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(threads[0]?.studentId ?? null);

  const active = threads.find((t) => t.studentId === activeId) ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="animate-fade-up">
        <SectionLabel>Messages</SectionLabel>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Student messages</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Conversations from students in your class.
        </p>
      </header>

      {threads.length === 0 ? (
        <EmptyState
          title="No messages yet"
          body="When a student in your class sends a message, it'll show up here."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <GlassPanel className="max-h-[32rem] overflow-y-auto p-2">
            <ul className="space-y-1">
              {threads.map((t) => (
                <li key={t.studentId}>
                  <button
                    onClick={() => setActiveId(t.studentId)}
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 text-left transition-colors",
                      t.studentId === activeId
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-secondary/50",
                    )}
                  >
                    <p className="truncate text-sm font-medium">{t.studentName}</p>
                    <p className="text-muted-foreground truncate text-xs">{t.className}</p>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">{t.lastMessage}</p>
                  </button>
                </li>
              ))}
            </ul>
          </GlassPanel>

          {active && (
            <MessageThreadView
              messages={active.messages}
              currentRole="teacher"
              onSend={async (text) => {
                await sendTeacherMessage({ data: { studentId: active.studentId, text } });
                router.invalidate();
              }}
              placeholder={`Reply to ${active.studentName}…`}
            />
          )}
        </div>
      )}
    </div>
  );
}
