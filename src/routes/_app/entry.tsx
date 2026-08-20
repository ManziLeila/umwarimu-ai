import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { GlassPanel, SectionLabel, EmptyState } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitAttendance, submitScores } from "@/lib/entry.functions";
import { highSchoolSubjects } from "@/lib/mock-data";
import { getStudentsData } from "@/lib/students.functions";

export const Route = createFileRoute("/_app/entry")({
  loader: () => getStudentsData(),
  head: () => ({ meta: [{ title: "Enter marks & attendance · Umwarimu AI" }] }),
  component: EntryPage,
});

type AttendanceStatus = "present" | "absent" | "late";
type Tab = "attendance" | "marks";

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function EntryPage() {
  const students = Route.useLoaderData();
  const [tab, setTab] = useState<Tab>("attendance");
  const classes = useMemo(
    () => Array.from(new Set(students.map((s) => s.className))).sort(),
    [students],
  );
  const [classFilter, setClassFilter] = useState<string>("all");
  const roster =
    classFilter === "all" ? students : students.filter((s) => s.className === classFilter);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="animate-fade-up">
        <SectionLabel>Class teacher</SectionLabel>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Enter marks &amp; attendance</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Fill this in directly for your class — no separate form needed.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="glass flex shrink-0 items-center rounded-full p-1 text-sm">
          {(["attendance", "marks"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              aria-pressed={tab === k}
              className={`rounded-full px-4 py-1.5 font-medium capitalize transition-colors ${
                tab === k
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        {classes.length > 1 && (
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="border-border bg-secondary/40 h-9 rounded-md border px-3 text-sm"
            aria-label="Filter by class"
          >
            <option value="all">All classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {roster.length === 0 ? (
        <EmptyState
          title="No students yet"
          body="Once your admin adds students to your class, they'll show up here."
        />
      ) : tab === "attendance" ? (
        <AttendanceForm roster={roster} />
      ) : (
        <MarksForm roster={roster} />
      )}
    </div>
  );
}

function AttendanceForm({ roster }: { roster: { id: string; name: string; className: string }[] }) {
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(roster.map((s) => [s.id, "present" as AttendanceStatus])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<Array<{ studentId: string; reason: string }>>([]);

  const setOne = (studentId: string, value: AttendanceStatus) =>
    setStatus((s) => ({ ...s, [studentId]: value }));

  const handleSubmit = async () => {
    setError(null);
    setNotice(null);
    setFlagged([]);
    setSubmitting(true);
    try {
      const entries = roster.map((s) => ({
        studentId: String(s.id),
        date,
        attendanceStatus: status[s.id] ?? "present",
      }));
      const result = await submitAttendance({ data: { entries } });
      setNotice(
        `Saved attendance for ${result.written} student${result.written === 1 ? "" : "s"}.`,
      );
      if (result.flagged.length > 0) {
        setFlagged(result.flagged.map((f) => ({ studentId: f.entry.studentId, reason: f.reason })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save attendance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassPanel className="animate-fade-up space-y-4 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Label htmlFor="attendance-date">Date</Label>
          <Input
            id="attendance-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 w-44 bg-secondary/40"
          />
        </div>
        <Button variant="hero" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Save attendance"}
        </Button>
      </div>

      {error && <p className="text-risk text-xs">{error}</p>}
      {notice && <p className="text-success text-xs">{notice}</p>}
      {flagged.length > 0 && (
        <div className="space-y-1 rounded-xl border border-risk/30 bg-risk/5 p-3 text-xs">
          <p className="font-medium text-risk">Some rows weren't saved:</p>
          {flagged.map((f, i) => (
            <p key={i} className="text-muted-foreground">
              {f.studentId}: {f.reason}
            </p>
          ))}
        </div>
      )}

      <ul className="divide-y divide-border">
        {roster.map((s) => (
          <li key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{s.name}</p>
              <p className="text-muted-foreground truncate text-xs">{s.className}</p>
            </div>
            <div className="glass flex shrink-0 items-center rounded-full p-1 text-xs">
              {(["present", "absent", "late"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setOne(s.id, v)}
                  aria-pressed={status[s.id] === v}
                  className={`rounded-full px-3 py-1 font-medium capitalize transition-colors ${
                    status[s.id] === v
                      ? v === "present"
                        ? "bg-success/20 text-success"
                        : v === "absent"
                          ? "bg-risk/20 text-risk"
                          : "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}

function MarksForm({ roster }: { roster: { id: string; name: string; className: string }[] }) {
  const [subject, setSubject] = useState(highSchoolSubjects[0]!);
  const [customSubject, setCustomSubject] = useState("");
  const [date, setDate] = useState(todayIso());
  const [maxScore, setMaxScore] = useState("100");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<Array<{ studentId: string; reason: string }>>([]);

  const handleSubmit = async () => {
    setError(null);
    setNotice(null);
    setFlagged([]);

    const resolvedSubject = subject === "Other" ? customSubject.trim() : subject;
    if (!resolvedSubject) {
      setError("Enter a subject first.");
      return;
    }
    const max = Number(maxScore);
    if (!(max > 0)) {
      setError("Max score must be greater than 0.");
      return;
    }
    const entries = roster
      .filter((s) => scores[s.id] !== undefined && scores[s.id] !== "")
      .map((s) => ({
        studentId: String(s.id),
        subject: resolvedSubject,
        date,
        score: Number(scores[s.id]),
        maxScore: max,
      }));
    if (entries.length === 0) {
      setError("Enter at least one score.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitScores({ data: { entries } });
      setNotice(`Saved ${result.written} score${result.written === 1 ? "" : "s"}.`);
      if (result.flagged.length > 0) {
        setFlagged(result.flagged.map((f) => ({ studentId: f.entry.studentId, reason: f.reason })));
      } else {
        setScores({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save marks. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassPanel className="animate-fade-up space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="marks-subject">Subject</Label>
          <select
            id="marks-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border-border bg-secondary/40 h-10 w-full rounded-md border px-3 text-sm"
          >
            {highSchoolSubjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {subject === "Other" && (
            <Input
              placeholder="Type the subject name"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              className="h-10 bg-secondary/40"
            />
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="marks-date">Date</Label>
          <Input
            id="marks-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 bg-secondary/40"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="marks-max">Max score</Label>
          <Input
            id="marks-max"
            type="number"
            min={1}
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            className="h-10 bg-secondary/40"
          />
        </div>
      </div>

      {error && <p className="text-risk text-xs">{error}</p>}
      {notice && <p className="text-success text-xs">{notice}</p>}
      {flagged.length > 0 && (
        <div className="space-y-1 rounded-xl border border-risk/30 bg-risk/5 p-3 text-xs">
          <p className="font-medium text-risk">Some rows weren't saved:</p>
          {flagged.map((f, i) => (
            <p key={i} className="text-muted-foreground">
              {f.studentId}: {f.reason}
            </p>
          ))}
        </div>
      )}

      <ul className="divide-y divide-border">
        {roster.map((s) => (
          <li key={s.id} className="grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{s.name}</p>
              <p className="text-muted-foreground truncate text-xs">{s.className}</p>
            </div>
            <Input
              type="number"
              min={0}
              placeholder="—"
              value={scores[s.id] ?? ""}
              onChange={(e) => setScores((prev) => ({ ...prev, [s.id]: e.target.value }))}
              className="h-9 bg-secondary/40 text-center"
              aria-label={`Score for ${s.name}`}
            />
          </li>
        ))}
      </ul>

      <Button
        variant="hero"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full sm:w-auto"
      >
        {submitting ? "Saving…" : "Save marks"}
      </Button>
    </GlassPanel>
  );
}
