import { createFileRoute } from "@tanstack/react-router";

import { TutorChat } from "@/components/TutorChat";

export const Route = createFileRoute("/portal/tutor")({
  head: () => ({
    meta: [
      { title: "AI Tutor · Umwarimu AI" },
      {
        name: "description",
        content:
          "Bilingual AI tutor for Rwandan learners: step-by-step explanations, practice sets and study plans in English and Kinyarwanda.",
      },
    ],
  }),
  component: TutorChat,
});
