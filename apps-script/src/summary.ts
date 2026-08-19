// Pure logic only. buildFallbackSummary is what actually gets emailed
// whenever Gemini is unavailable, rate-limited, or not configured yet — the
// at-risk alert must never silently fail to notify anyone just because the
// AI call had a bad day.

import type { AtRiskAssessment } from "./atRisk";

export function buildFallbackSummary(assessment: AtRiskAssessment, studentName: string): string {
  const parts: string[] = [`${studentName} may need some extra support right now.`];

  assessment.atRiskSubjects.forEach((s) => {
    const scores = s.recentScores.map((r) => `${r.pct}%`).join(", ");
    parts.push(`In ${s.subject}, the last ${s.recentScores.length} scores were low (${scores}).`);
  });

  if (assessment.attendance.isAtRisk) {
    parts.push(
      `Attendance over the last ${assessment.attendance.totalDays} recorded school day(s) was ${assessment.attendance.attendanceRatePct}%.`,
    );
  }

  parts.push("This is an early heads-up so support can start now, not a report card.");
  return parts.join(" ");
}

export function buildGeminiPrompt(assessment: AtRiskAssessment, studentName: string): string {
  const facts = buildFallbackSummary(assessment, studentName);
  return [
    "You are Umwarimu AI, writing a short, warm, plain-language note to a parent/guardian and",
    "teacher about a Rwandan secondary school student who may need extra support.",
    "Rewrite the facts below into 3-4 short sentences: which subject(s) if any, what pattern was",
    "seen, and recent attendance if relevant. Keep it factual and supportive, never alarming or",
    "blaming. Do not invent facts beyond what is given. Plain text only, no markdown.",
    "",
    `Facts: ${facts}`,
  ].join(" ");
}
