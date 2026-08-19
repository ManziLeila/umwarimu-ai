import { assessStudentRisk } from "../src/atRisk";
import { buildFallbackSummary, buildGeminiPrompt } from "../src/summary";
import type { ScoreEntry, SchoolConfig } from "../src/types";

const config: SchoolConfig = { lowScorePct: 50, attendanceThresholdPct: 80, rollingPeriodDays: 30 };

describe("buildFallbackSummary", () => {
  it("mentions the at-risk subject and its recent scores", () => {
    const scores: ScoreEntry[] = [
      { studentId: "s1", subject: "Mathematics", date: "2026-05-01", score: 40, maxScore: 100 },
      { studentId: "s1", subject: "Mathematics", date: "2026-05-08", score: 35, maxScore: 100 },
      { studentId: "s1", subject: "Mathematics", date: "2026-05-15", score: 42, maxScore: 100 },
    ];
    const assessment = assessStudentRisk("s1", scores, [], config, "2026-06-01");
    const summary = buildFallbackSummary(assessment, "Eric Habimana");

    expect(summary).toContain("Eric Habimana");
    expect(summary).toContain("Mathematics");
    expect(summary).toContain("40%");
  });

  it("does not mention attendance when attendance is not at risk", () => {
    const assessment = assessStudentRisk(
      "s1",
      [
        { studentId: "s1", subject: "Mathematics", date: "2026-05-01", score: 40, maxScore: 100 },
        { studentId: "s1", subject: "Mathematics", date: "2026-05-08", score: 35, maxScore: 100 },
        { studentId: "s1", subject: "Mathematics", date: "2026-05-15", score: 42, maxScore: 100 },
      ],
      [{ studentId: "s1", date: "2026-05-30", attendanceStatus: "present" }],
      config,
      "2026-06-01",
    );
    expect(buildFallbackSummary(assessment, "Eric Habimana")).not.toContain("Attendance");
  });
});

describe("buildGeminiPrompt", () => {
  it("embeds the fallback facts and asks for a short, factual rewrite", () => {
    const assessment = assessStudentRisk(
      "s1",
      [
        { studentId: "s1", subject: "Mathematics", date: "2026-05-01", score: 40, maxScore: 100 },
        { studentId: "s1", subject: "Mathematics", date: "2026-05-08", score: 35, maxScore: 100 },
        { studentId: "s1", subject: "Mathematics", date: "2026-05-15", score: 42, maxScore: 100 },
      ],
      [],
      config,
      "2026-06-01",
    );
    const prompt = buildGeminiPrompt(assessment, "Eric Habimana");
    expect(prompt).toContain("Eric Habimana");
    expect(prompt).toContain("Mathematics");
    expect(prompt).toContain("Facts:");
  });
});
