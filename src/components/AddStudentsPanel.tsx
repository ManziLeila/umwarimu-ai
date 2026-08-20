import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";

import { GlassPanel, SectionLabel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toCsv, parseCsv } from "@/lib/csv";
import { createStudent, bulkCreateStudents } from "@/lib/admin.functions";

const CSV_HEADERS = [
  "studentId",
  "name",
  "className",
  "guardianName",
  "guardianEmail",
  "studentEmail",
  "username",
];

export function AddStudentsPanel({
  classOptions,
  onAdded,
}: {
  /** Non-empty = teacher, locked to these classes. Empty = admin, free text. */
  classOptions: string[];
  onAdded: () => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [className, setClassName] = useState(classOptions[0] ?? "");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const downloadTemplate = () => {
    const exampleClass = classOptions[0] ?? "S3 Mathematics";
    const csv = toCsv(CSV_HEADERS, [
      {
        studentId: "stu-0001",
        name: "Jane Uwase",
        className: exampleClass,
        guardianName: "Guardian Name",
        guardianEmail: "guardian@example.com",
        studentEmail: "student@example.com",
        username: "juwase",
      },
    ]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "umwarimu-students-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (file: File) => {
    setError(null);
    setNotice(null);
    setUploading(true);
    try {
      const rows = parseCsv(await file.text()).map((r) => ({
        studentId: r["studentId"] ?? "",
        name: r["name"] ?? "",
        className: r["className"] ?? "",
        guardianName: r["guardianName"] ?? "",
        guardianEmail: r["guardianEmail"] ?? "",
        studentEmail: r["studentEmail"] ?? "",
        username: r["username"] ?? "",
      }));
      if (rows.length === 0) {
        setError("That file has no rows to import.");
        return;
      }
      const result = await bulkCreateStudents({ data: { students: rows } });
      setNotice(
        `Created ${result.created.length} of ${rows.length} student${rows.length === 1 ? "" : "s"}.` +
          (result.failed.length > 0 ? ` ${result.failed.length} failed — see below.` : ""),
      );
      if (result.failed.length > 0) {
        setError(result.failed.map((f) => `${f.studentId}: ${f.reason}`).join("\n"));
      }
      if (result.created.length > 0) onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that file.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const result = await createStudent({
        data: { studentId, name, className, guardianName, guardianEmail, studentEmail, username },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice(
        result.emailSent
          ? `Account created — credentials emailed to ${studentEmail}.`
          : `Account created. Email didn't send — temp password: ${result.tempPassword}`,
      );
      setStudentId("");
      setName("");
      setGuardianName("");
      setGuardianEmail("");
      setStudentEmail("");
      setUsername("");
      onAdded();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't create that account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassPanel className="animate-fade-up space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel>Add students</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <Button variant="glass" size="sm" onClick={downloadTemplate}>
            <Download className="size-3.5" /> Download template
          </Button>
          <Button
            variant="glass"
            size="sm"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          >
            <Upload className="size-3.5" /> {uploading ? "Uploading…" : "Bulk upload"}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
        </div>
      </div>

      {error && <p className="text-risk whitespace-pre-line text-xs">{error}</p>}
      {notice && <p className="text-success text-xs">{notice}</p>}

      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="student-id">Student ID</Label>
          <Input
            id="student-id"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="h-10 bg-secondary/40"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-name">Full name</Label>
          <Input
            id="student-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 bg-secondary/40"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-class">Class</Label>
          {classOptions.length > 0 ? (
            <select
              id="student-class"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="border-border bg-secondary/40 h-10 w-full rounded-md border px-3 text-sm"
            >
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id="student-class"
              placeholder="e.g. S3 Mathematics"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="h-10 bg-secondary/40"
              required
            />
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-username">Username</Label>
          <Input
            id="student-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-10 bg-secondary/40"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="guardian-name">Guardian name</Label>
          <Input
            id="guardian-name"
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
            className="h-10 bg-secondary/40"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="guardian-email">Guardian email</Label>
          <Input
            id="guardian-email"
            type="email"
            value={guardianEmail}
            onChange={(e) => setGuardianEmail(e.target.value)}
            className="h-10 bg-secondary/40"
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="student-email">Student's own email</Label>
          <Input
            id="student-email"
            type="email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            className="h-10 bg-secondary/40"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" variant="hero" disabled={submitting}>
            {submitting ? "Creating…" : "Create student"}
          </Button>
        </div>
      </form>
    </GlassPanel>
  );
}
