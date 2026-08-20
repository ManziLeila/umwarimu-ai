import { createFileRoute } from "@tanstack/react-router";

import { StudentDetailView } from "@/components/StudentDetailView";
import { useApp } from "@/lib/app-context";
import { getMyStudentDetailData } from "@/lib/students.functions";

export const Route = createFileRoute("/portal/dashboard")({
  loader: () => getMyStudentDetailData(),
  head: () => ({ meta: [{ title: "My Progress · Umwarimu AI" }] }),
  component: PortalDashboard,
});

function PortalDashboard() {
  const student = Route.useLoaderData();
  const { lang } = useApp();

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <h1 className="text-2xl font-bold sm:text-3xl">Hi, {student.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Here's how your term is going — and where a bit more practice would help most.
        </p>
      </header>
      <StudentDetailView student={student} lang={lang} />
    </div>
  );
}
