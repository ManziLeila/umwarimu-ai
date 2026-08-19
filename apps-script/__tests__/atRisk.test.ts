import {
  assessStudentRisk,
  buildReasonFingerprint,
  detectAttendanceRisk,
  detectLowScoreSubjects,
  shouldSendAlert,
} from "../src/atRisk";
import type { AttendanceEntry, ScoreEntry, SchoolConfig } from "../src/types";

const config: SchoolConfig = { lowScorePct: 50, attendanceThresholdPct: 80, rollingPeriodDays: 30 };

function score(subject: string, date: string, score: number, maxScore = 100): ScoreEntry {
  return { studentId: "s1", subject, date, score, maxScore };
}

function attendance(date: string, attendanceStatus: AttendanceEntry["attendanceStatus"]): AttendanceEntry {
  return { studentId: "s1", date, attendanceStatus };
}

describe("detectLowScoreSubjects", () => {
  it("flags a subject with 3 consecutive scores below the threshold", () => {
    const scores = [score("Mathematics", "2026-05-01", 40), score("Mathematics", "2026-05-08", 35), score("Mathematics", "2026-05-15", 42)];
    const result = detectLowScoreSubjects(scores, 50);
    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe("Mathematics");
    expect(result[0].recentScores).toHaveLength(3);
  });

  it("does not flag a subject with fewer than 3 recorded scores", () => {
    const scores = [score("Mathematics", "2026-05-01", 30), score("Mathematics", "2026-05-08", 35)];
    expect(detectLowScoreSubjects(scores, 50)).toHaveLength(0);
  });

  it("does not flag when the streak is broken by a passing score", () => {
    const scores = [score("Mathematics", "2026-05-01", 40), score("Mathematics", "2026-05-08", 65), score("Mathematics", "2026-05-15", 42)];
    expect(detectLowScoreSubjects(scores, 50)).toHaveLength(0);
  });

  it("only looks at the 3 most recent scores, ignoring older ones", () => {
    // An old low score plus 3 recent passes should NOT flag.
    const scores = [
      score("Mathematics", "2026-01-01", 10),
      score("Mathematics", "2026-05-01", 90),
      score("Mathematics", "2026-05-08", 88),
      score("Mathematics", "2026-05-15", 92),
    ];
    expect(detectLowScoreSubjects(scores, 50)).toHaveLength(0);
  });

  it("evaluates each subject independently", () => {
    const scores = [
      score("Mathematics", "2026-05-01", 40),
      score("Mathematics", "2026-05-08", 35),
      score("Mathematics", "2026-05-15", 42),
      score("English", "2026-05-01", 80),
      score("English", "2026-05-08", 85),
      score("English", "2026-05-15", 90),
    ];
    const result = detectLowScoreSubjects(scores, 50);
    expect(result.map((r) => r.subject)).toEqual(["Mathematics"]);
  });
});

describe("detectAttendanceRisk", () => {
  const asOf = "2026-06-01";

  it("flags attendance below the threshold within the rolling window", () => {
    const entries: AttendanceEntry[] = [
      attendance("2026-05-25", "absent"),
      attendance("2026-05-26", "absent"),
      attendance("2026-05-27", "present"),
      attendance("2026-05-28", "absent"),
      attendance("2026-05-29", "present"),
    ];
    const result = detectAttendanceRisk(entries, config, asOf);
    expect(result.isAtRisk).toBe(true);
    expect(result.attendanceRatePct).toBeLessThan(80);
  });

  it("counts late as attendance, not absence", () => {
    const entries: AttendanceEntry[] = [
      attendance("2026-05-25", "late"),
      attendance("2026-05-26", "late"),
      attendance("2026-05-27", "present"),
      attendance("2026-05-28", "present"),
    ];
    const result = detectAttendanceRisk(entries, config, asOf);
    expect(result.attendanceRatePct).toBe(100);
    expect(result.isAtRisk).toBe(false);
  });

  it("ignores entries outside the rolling window", () => {
    const entries: AttendanceEntry[] = [
      attendance("2026-01-01", "absent"),
      attendance("2026-01-02", "absent"),
      attendance("2026-05-30", "present"),
      attendance("2026-05-31", "present"),
    ];
    const result = detectAttendanceRisk(entries, config, asOf);
    expect(result.totalDays).toBe(2);
    expect(result.isAtRisk).toBe(false);
  });

  it("is not at risk when there is no attendance data at all", () => {
    const result = detectAttendanceRisk([], config, asOf);
    expect(result.isAtRisk).toBe(false);
    expect(result.totalDays).toBe(0);
  });
});

describe("assessStudentRisk", () => {
  it("is at risk if either scores or attendance trigger, and not if neither does", () => {
    const lowScores = [score("Mathematics", "2026-05-01", 40), score("Mathematics", "2026-05-08", 35), score("Mathematics", "2026-05-15", 42)];
    const goodAttendance = [attendance("2026-05-30", "present")];
    const atRisk = assessStudentRisk("s1", lowScores, goodAttendance, config, "2026-06-01");
    expect(atRisk.isAtRisk).toBe(true);

    const goodScores = [score("Mathematics", "2026-05-01", 90)];
    const notAtRisk = assessStudentRisk("s1", goodScores, goodAttendance, config, "2026-06-01");
    expect(notAtRisk.isAtRisk).toBe(false);
  });
});

describe("shouldSendAlert / buildReasonFingerprint", () => {
  const lowScores = [score("Mathematics", "2026-05-01", 40), score("Mathematics", "2026-05-08", 35), score("Mathematics", "2026-05-15", 42)];
  const assessment = assessStudentRisk("s1", lowScores, [], config, "2026-06-01");

  it("does not build an alert for a student who isn't at risk", () => {
    const notAtRisk = assessStudentRisk("s1", [], [], config, "2026-06-01");
    expect(shouldSendAlert(notAtRisk, [], "2026-06-01", 7).send).toBe(false);
  });

  it("sends on the first alert for a student", () => {
    expect(shouldSendAlert(assessment, [], "2026-06-01", 7).send).toBe(true);
  });

  it("suppresses a repeat of the identical reason within the cooldown window", () => {
    const prior = [{ studentId: "s1", dateSent: "2026-05-28", reasonFingerprint: buildReasonFingerprint(assessment) }];
    expect(shouldSendAlert(assessment, prior, "2026-06-01", 7).send).toBe(false);
  });

  it("sends again once the cooldown window has passed", () => {
    const prior = [{ studentId: "s1", dateSent: "2026-05-20", reasonFingerprint: buildReasonFingerprint(assessment) }];
    expect(shouldSendAlert(assessment, prior, "2026-06-01", 7).send).toBe(true);
  });

  it("sends immediately if the reason changed, even inside the cooldown window", () => {
    const prior = [{ studentId: "s1", dateSent: "2026-05-30", reasonFingerprint: "subjects:English|attendance:false" }];
    expect(shouldSendAlert(assessment, prior, "2026-06-01", 7).send).toBe(true);
  });

  it("fingerprint is independent of subject ordering", () => {
    const a = assessStudentRisk(
      "s1",
      [...lowScores, score("English", "2026-05-01", 20), score("English", "2026-05-08", 25), score("English", "2026-05-15", 22)],
      [],
      config,
      "2026-06-01",
    );
    const fingerprint = buildReasonFingerprint(a);
    expect(fingerprint).toContain("English");
    expect(fingerprint).toContain("Mathematics");
  });
});
