import { createFileRoute } from "@tanstack/react-router";

import { GlassPanel, SectionLabel } from "@/components/kit";
import { LangToggle } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/app-context";
import { school, subjects } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Umwarimu AI" },
      {
        name: "description",
        content:
          "School configuration, academic year, language and accessibility settings including reduced motion.",
      },
      { property: "og:title", content: "Settings · Umwarimu AI" },
      {
        property: "og:description",
        content: "School profile, language and accessibility preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { reduceMotion, setReduceMotion } = useApp();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="animate-fade-up">
        <SectionLabel>Preferences</SectionLabel>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Settings</h1>
      </header>

      <GlassPanel className="space-y-5 p-5">
        <SectionLabel>School configuration</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="school-name">School name</Label>
            <Input id="school-name" defaultValue={school.name} className="bg-secondary/40" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="academic-year">Academic year</Label>
            <Input
              id="academic-year"
              defaultValue={school.academicYear}
              className="bg-secondary/40"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subjects">Subjects tracked</Label>
          <Input id="subjects" defaultValue={subjects.join(", ")} className="bg-secondary/40" />
        </div>
      </GlassPanel>

      <GlassPanel className="space-y-5 p-5">
        <SectionLabel>Language</SectionLabel>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">Interface language</p>
            <p className="text-muted-foreground text-xs">English · Kinyarwanda</p>
          </div>
          <LangToggle />
        </div>
      </GlassPanel>

      <GlassPanel className="space-y-5 p-5">
        <SectionLabel>Accessibility</SectionLabel>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Label htmlFor="reduce-motion" className="text-sm font-medium">
              Reduce motion
            </Label>
            <p className="text-muted-foreground text-xs">
              Disables ambient background movement and non-essential animation.
            </p>
          </div>
          <Switch id="reduce-motion" checked={reduceMotion} onCheckedChange={setReduceMotion} />
        </div>
      </GlassPanel>
    </div>
  );
}
