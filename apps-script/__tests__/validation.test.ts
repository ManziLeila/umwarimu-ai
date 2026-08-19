import { scoreKey, validateAttendanceEntries, validateScoreEntries } from "../src/validation";
import type { AttendanceEntry, ScoreEntry } from "../src/types";

const knownStudents = new Set(["s1", "s2"]);

describe("validateScoreEntries", () => {
  const base: ScoreEntry = { studentId: "s1", subject: "Mathematics", date: "2026-06-09", score: 42, maxScore: 60 };

  it("accepts a well-formed entry", () => {
    const { valid, flagged } = validateScoreEntries([base], knownStudents, new Set());
    expect(valid).toHaveLength(1);
    expect(flagged).toHaveLength(0);
  });

  it("flags an unknown student ID", () => {
    const { flagged } = validateScoreEntries([{ ...base, studentId: "ghost" }], knownStudents, new Set());
    expect(flagged).toHaveLength(1);
    expect(flagged[0].reason).toMatch(/Unknown student/);
  });

  it("flags a score greater than max score", () => {
    const { flagged } = validateScoreEntries([{ ...base, score: 70 }], knownStudents, new Set());
    expect(flagged[0].reason).toMatch(/exceeds max score/);
  });

  it("flags a negative score", () => {
    const { flagged } = validateScoreEntries([{ ...base, score: -5 }], knownStudents, new Set());
    expect(flagged[0].reason).toMatch(/cannot be negative/);
  });

  it("flags a zero max score", () => {
    const { flagged } = validateScoreEntries([{ ...base, maxScore: 0 }], knownStudents, new Set());
    expect(flagged[0].reason).toMatch(/Max score must be greater than 0/);
  });

  it("flags a duplicate against already-recorded entries", () => {
    const existingKeys = new Set([scoreKey(base)]);
    const { flagged } = validateScoreEntries([base], knownStudents, existingKeys);
    expect(flagged[0].reason).toMatch(/Duplicate/);
  });

  it("flags duplicates within the same batch, keeping the first", () => {
    const { valid, flagged } = validateScoreEntries([base, { ...base }], knownStudents, new Set());
    expect(valid).toHaveLength(1);
    expect(flagged).toHaveLength(1);
  });
});

describe("validateAttendanceEntries", () => {
  const base: AttendanceEntry = { studentId: "s1", date: "2026-06-09", attendanceStatus: "present" };

  it("accepts a well-formed entry", () => {
    const { valid, flagged } = validateAttendanceEntries([base], knownStudents, new Set());
    expect(valid).toHaveLength(1);
    expect(flagged).toHaveLength(0);
  });

  it("flags an unrecognized status", () => {
    const { flagged } = validateAttendanceEntries(
      [{ ...base, attendanceStatus: "excused" as AttendanceEntry["attendanceStatus"] }],
      knownStudents,
      new Set(),
    );
    expect(flagged[0].reason).toMatch(/Unrecognized attendance status/);
  });

  it("flags an unknown student", () => {
    const { flagged } = validateAttendanceEntries([{ ...base, studentId: "ghost" }], knownStudents, new Set());
    expect(flagged[0].reason).toMatch(/Unknown student/);
  });

  it("flags a duplicate against already-recorded entries", () => {
    const existingKeys = new Set(["s1|2026-06-09"]);
    const { flagged } = validateAttendanceEntries([base], knownStudents, existingKeys);
    expect(flagged[0].reason).toMatch(/Duplicate/);
  });
});
