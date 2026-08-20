import { createFileRoute, useRouter } from "@tanstack/react-router";

import { MessageThreadView } from "@/components/MessageThreadView";
import { SectionLabel } from "@/components/kit";
import { getMyMessages, sendMyMessage } from "@/lib/messages.functions";

export const Route = createFileRoute("/portal/messages")({
  loader: () => getMyMessages(),
  head: () => ({ meta: [{ title: "Messages · Umwarimu AI" }] }),
  component: PortalMessages,
});

function PortalMessages() {
  const messages = Route.useLoaderData();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="animate-fade-up">
        <SectionLabel>Messages</SectionLabel>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Chat with your teacher</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Send a message to your class teacher — they'll see it and can reply here.
        </p>
      </header>
      <MessageThreadView
        messages={messages}
        currentRole="student"
        onSend={async (text) => {
          await sendMyMessage({ data: { text } });
          router.invalidate();
        }}
        placeholder="Message your teacher…"
      />
    </div>
  );
}
