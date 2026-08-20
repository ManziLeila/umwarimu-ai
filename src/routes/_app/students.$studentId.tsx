import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { StudentDetailView } from "@/components/StudentDetailView";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { getStudentDetailData } from "@/lib/students.functions";

export const Route = createFileRoute("/_app/students/$studentId")({
  loader: async ({ params }) => {
    try {
      const student = await getStudentDetailData({ data: { studentId: params.studentId } });
      return { student };
    } catch {
      throw notFound();
    }
  },
  head: () => ({
    meta: [
      { title: "Student Profile · Umwarimu AI" },
      {
        name: "description",
        content:
          "Human-centered learner profile: subject performance, assessments, attendance and AI recommendations.",
      },
      { property: "og:title", content: "Student Profile · Umwarimu AI" },
      {
        property: "og:description",
        content: "Subject performance, assessments, attendance and AI recommendations.",
      },
    ],
  }),
  component: StudentProfile,
});

function StudentProfile() {
  const { student } = Route.useLoaderData();
  const { lang } = useApp();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link to="/students">
          <ArrowLeft /> Back to students
        </Link>
      </Button>
      <StudentDetailView student={student} lang={lang} canAddNote />
    </div>
  );
}
