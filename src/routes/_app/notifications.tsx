import { createFileRoute } from "@tanstack/react-router";

import { GlassPanel, SectionLabel } from "@/components/kit";
import { AiOrb } from "@/components/AiOrb";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notifications } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications · Umwarimu AI" },
      {
        name: "description",
        content: "Support alerts, generated study plans and automation updates in one place.",
      },
      { property: "og:title", content: "Notifications · Umwarimu AI" },
      {
        property: "og:description",
        content: "Support alerts, study plans and workflow updates for your class.",
      },
    ],
  }),
  component: Notifications,
});

const tone = {
  warning: "border-warning/30 bg-warning/[0.07] text-warning",
  accent: "border-primary/30 bg-primary/[0.07] text-primary",
  success: "border-success/30 bg-success/[0.07] text-success",
} as const;

function Notifications() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="animate-fade-up grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <SectionLabel>Notification center</SectionLabel>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Alerts &amp; updates</h1>
        </div>
        <Button variant="ghost" size="sm">
          Mark all read
        </Button>
      </header>

      <ul className="space-y-3">
        {notifications.map((n) => (
          <li key={n.id}>
            <GlassPanel hover className="p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <AiOrb size={18} active={n.unread} />
                    <p
                      className={cn(
                        "font-display truncate text-[0.7rem] font-bold tracking-[0.2em] uppercase",
                        tone[n.tone].split(" ").at(-1),
                      )}
                    >
                      {n.title}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{n.body}</p>
                  <p className="text-muted-foreground mt-2 text-xs">{n.time}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {n.unread && <span className="size-2 rounded-full bg-primary glow-dot text-primary" />}
                  <Button variant="glass" size="sm">
                    Review
                  </Button>
                </div>
              </div>
            </GlassPanel>
          </li>
        ))}
      </ul>
    </div>
  );
}
