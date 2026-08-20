import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

import { GlassPanel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MessageItem } from "@/lib/backend.server";

export function MessageThreadView({
  messages,
  currentRole,
  onSend,
  placeholder = "Type a message…",
  emptyLabel = "No messages yet — say hello.",
}: {
  messages: MessageItem[];
  currentRole: "student" | "teacher";
  onSend: (text: string) => Promise<void>;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const handleSend = async () => {
    const text = value.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);
    try {
      await onSend(text);
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <GlassPanel className="flex h-[26rem] flex-col overflow-hidden p-0 sm:h-[30rem]">
      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">{emptyLabel}</p>
        ) : (
          messages.map((m) => {
            const isSelf = m.senderRole === currentRole;
            return (
              <div
                key={m.id}
                className={cn("animate-fade-up flex flex-col gap-1", isSelf && "items-end")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    isSelf ? "bg-primary/15 border border-primary/25" : "bg-secondary/60",
                  )}
                >
                  {m.text}
                </div>
                <span className="text-muted-foreground px-1 text-[0.65rem]">
                  {m.senderName} ·{" "}
                  {new Date(m.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3 sm:p-4">
        {error && <p className="text-risk mb-2 text-xs">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-11 rounded-xl bg-secondary/40"
          />
          <Button
            type="submit"
            variant="hero"
            size="icon"
            disabled={sending}
            aria-label="Send message"
          >
            <Send />
          </Button>
        </form>
      </div>
    </GlassPanel>
  );
}
