import {
  buildAttendanceByWeek,
  buildDashboardData,
  buildPerformanceTrend,
  buildStudentDetail,
  buildSubjectAverages,
  filterByClasses,
  summarizeStudent,
} from "../src/dashboardData";
import type { AttendanceEntry, ScoreEntry, SchoolConfig, Student } from "../src/types";

const config: SchoolConfig = { lowScorePct: 50, attendanceThresholdPct: 80, rollingPeriodDays: 30 };

const student: Student = {
  studentId: "s1",
  name: "Eric Habimana",
  className: "S3 Mathematics",
  guardianName: "Mrs Habimana",
  guardianEmail: "guardian@example.com",
  status: "active",
};

function score(subject: string, date: string, score: number, maxScore = 100): ScoreEntry {
  return { studentId: "s1", subject, date, score, maxScore };
}

describe("summarizeStudent", () => {
  it("categorizes a student with no flags as on-track", () => {
    const scores = [score("Mathematics", "2026-05-20", 85), score("Mathematics", "2026-05-27", 82)];
    const attendance: AttendanceEntry[] = [
      { studentId: "s1", date: "2026-05-30", attendanceStatus: "present" },
    ];
    const summary = summarizeStudent(student, scores, attendance, config, "2026-06-01");
    expect(summary.status).toBe("on-track");
  });

  it("categorizes a single flag as support, not risk", () => {
    const scores = [
      score("Mathematics", "2026-05-01", 40),
      score("Mathematics", "2026-05-08", 35),
      score("Mathematics", "2026-05-15", 42),
    ];
    const attendance: AttendanceEntry[] = [
      { studentId: "s1", date: "2026-05-30", attendanceStatus: "present" },
    ];
    const summary = summarizeStudent(student, scores, attendance, config, "2026-06-01");
    expect(summary.status).toBe("support");
  });

  it("categorizes two simultaneous flags as risk", () => {
    const scores = [
      score("Mathematics", "2026-05-01", 40),
      score("Mathematics", "2026-05-08", 35),
      score("Mathematics", "2026-05-15", 42),
    ];
    const attendance: AttendanceEntry[] = [
      { studentId: "s1", date: "2026-05-25", attendanceStatus: "absent" },
      { studentId: "s1", date: "2026-05-26", attendanceStatus: "absent" },
      { studentId: "s1", date: "2026-05-27", attendanceStatus: "absent" },
    ];
    const summary = summarizeStudent(student, scores, attendance, config, "2026-06-01");
    expect(summary.status).toBe("risk");
  });

  it("identifies the weakest subject by lowest average", () => {
    const scores = [score("Mathematics", "2026-05-01", 40), score("English", "2026-05-01", 90)];
    const summary = summarizeStudent(student, scores, [], config, "2026-06-01");
    expect(summary.weakest).toBe("Mathematics");
  });
});

describe("buildStudentDetail", () => {
  it("includes per-subject averages and recent assessments", () => {
    const scores = [
      score("Mathematics", "2026-05-01", 80),
      score("Mathematics", "2026-05-15", 90),
      score("English", "2026-05-10", 70),
    ];
    const detail = buildStudentDetail(student, scores, [], config, "2026-06-01");
    expect(detail.subjects).toEqual(
      expect.arrayContaining([
        { subject: "Mathematics", score: 85 },
        { subject: "English", score: 70 },
      ]),
    );
    expect(detail.assessments).toHaveLength(3);
  });

  it("gives a generic positive recommendation and no weak subjects when nothing is flagged", () => {
    const scores = [score("Mathematics", "2026-05-01", 90)];
    const detail = buildStudentDetail(student, scores, [], config, "2026-06-01");
    expect(detail.recommendations[0]).toMatch(/no flags/i);
    expect(detail.weakSubjects).toEqual([]);
  });

  it("surfaces exactly the subjects flagged by the at-risk rule as weakSubjects", () => {
    const scores = [
      score("Mathematics", "2026-05-01", 40),
      score("Mathematics", "2026-05-08", 35),
      score("Mathematics", "2026-05-15", 42),
      score("English", "2026-05-01", 90),
    ];
    const detail = buildStudentDetail(student, scores, [], config, "2026-06-01");
    expect(detail.weakSubjects).toEqual(["Mathematics"]);
  });
});

describe("buildPerformanceTrend", () => {
  it("groups scores by month and subject", () => {
    const scores = [
      score("Mathematics", "2026-04-10", 60),
      score("Mathematics", "2026-05-10", 80),
      score("English", "2026-05-15", 70),
    ];
    const trend = buildPerformanceTrend(scores, ["Mathematics", "English"]);
    const may = trend.find((t) => t.period === "May");
    expect(may).toEqual({ period: "May", Mathematics: 80, English: 70 });
  });

  it("fills in 0 for a subject with no scores that month", () => {
    const scores = [score("Mathematics", "2026-05-10", 80)];
    const trend = buildPerformanceTrend(scores, ["Mathematics", "English"]);
    expect(trend[0]).toEqual({ period: "May", Mathematics: 80, English: 0 });
  });
});

describe("buildSubjectAverages", () => {
  it("averages each subject independently", () => {
    const scores = [
      score("Mathematics", "2026-05-01", 40),
      score("Mathematics", "2026-05-08", 60),
      score("English", "2026-05-01", 90),
    ];
    expect(buildSubjectAverages(scores, ["Mathematics", "English"])).toEqual([
      { subject: "Mathematics", average: 50 },
      { subject: "English", average: 90 },
    ]);
  });
});

describe("buildAttendanceByWeek", () => {
  it("computes a present+late rate per week, most recent last", () => {
    const attendance: AttendanceEntry[] = [
      { studentId: "s1", date: "2026-05-26", attendanceStatus: "absent" },
      { studentId: "s1", date: "2026-05-27", attendanceStatus: "present" },
      { studentId: "s1", date: "2026-06-01", attendanceStatus: "present" },
    ];
    const weeks = buildAttendanceByWeek(attendance, "2026-06-01", 2);
    expect(weeks).toHaveLength(2);
    expect(weeks[weeks.length - 1].week).toBe("W2");
  });

  it("defaults to 100 for a week with no recorded attendance", () => {
    const weeks = buildAttendanceByWeek([], "2026-06-01", 1);
    expect(weeks[0].attendance).toBe(100);
  });
});

describe("buildDashboardData", () => {
  it("counts needSupport and buckets students into supportStatus consistently", () => {
    const atRiskStudent: Student = { ...student, studentId: "s2", name: "Claudine" };
    const students = [student, atRiskStudent];
    const scores = [
      score("Mathematics", "2026-05-01", 90),
      { studentId: "s2", subject: "Mathematics", date: "2026-05-01", score: 40, maxScore: 100 },
      { studentId: "s2", subject: "Mathematics", date: "2026-05-08", score: 35, maxScore: 100 },
      { studentId: "s2", subject: "Mathematics", date: "2026-05-15", score: 42, maxScore: 100 },
    ];
    const data = buildDashboardData(students, scores, [], [], config, "2026-06-01");

    expect(data.metrics.students).toBe(2);
    expect(data.metrics.needSupport).toBe(1);
    const totalBucketed = data.supportStatus.reduce((sum, s) => sum + s.count, 0);
    expect(totalBucketed).toBe(2);
  });
});

describe("filterByClasses", () => {
  const rows = [
    { className: "S3 Mathematics", id: "a" },
    { className: "S3 English", id: "b" },
    { className: "S3 Mathematics", id: "c" },
  ];

  it("returns everyone when no classes are given (admin view)", () => {
    expect(filterByClasses(rows, [])).toHaveLength(3);
  });

  it("only returns rows matching the given class(es) (teacher view)", () => {
    const filtered = filterByClasses(rows, ["S3 Mathematics"]);
    expect(filtered.map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("supports a teacher assigned to more than one class", () => {
    const filtered = filterByClasses(rows, ["S3 Mathematics", "S3 English"]);
    expect(filtered).toHaveLength(3);
  });

  it("returns nothing for a class no student belongs to", () => {
    expect(filterByClasses(rows, ["S4 Physics"])).toHaveLength(0);
  });
});
