export type Trend = "up" | "down" | "flat";
export type StudentStatus = "on-track" | "improving" | "support" | "risk";

export type Student = {
  id: string;
  name: string;
  className: string;
  overall: number;
  attendance: number;
  trend: Trend;
  status: StudentStatus;
  weakest: string;
  subjects: { subject: string; score: number }[];
  assessments: { name: string; date: string; score: number }[];
  notes: { author: string; date: string; text: string }[];
  recommendations: string[];
};

export const school = {
  name: "Groupe Scolaire Kigali",
  academicYear: "2026 · Term 2",
  teacher: { name: "Mr. Jean Bizimana", role: "Teacher · S3 Mathematics", initials: "JB" },
};

export const subjects = ["Mathematics", "English", "Physics", "Biology", "Kinyarwanda"];

/** A broad, curriculum-agnostic list for the marks-entry subject picker —
 * covers REB, Cambridge and BTEC-style options so it's usable regardless
 * of which system a school follows. "Other" falls back to free text. */
export const highSchoolSubjects = [
  "Mathematics",
  "Sub-Mathematics",
  "English",
  "Kinyarwanda",
  "French",
  "Kiswahili",
  "Literature in English",
  "Physics",
  "Chemistry",
  "Biology",
  "Geography",
  "History",
  "Economics",
  "Entrepreneurship",
  "Computer Science / ICT",
  "Business Studies",
  "Accounting",
  "Agriculture",
  "Nutrition",
  "General Studies & Communication Skills",
  "Religion & Value Education",
  "Civic Education",
  "Physical Education",
  "Fine Art",
  "Music",
  "Other",
];

const mk = (
  id: string,
  name: string,
  className: string,
  overall: number,
  attendance: number,
  trend: Trend,
  status: StudentStatus,
  weakest: string,
): Student => ({
  id,
  name,
  className,
  overall,
  attendance,
  trend,
  status,
  weakest,
  subjects: subjects.map((s, i) => ({
    subject: s,
    score: Math.max(38, Math.min(96, overall + ((i * 13) % 21) - 10)),
  })),
  assessments: [
    { name: "Assessment 1", date: "12 May", score: Math.max(35, overall - 8) },
    { name: "Assessment 2", date: "26 May", score: Math.max(38, overall - 3) },
    { name: "Assessment 3", date: "09 Jun", score: overall + (trend === "up" ? 4 : -5) },
    { name: "Mid-term", date: "23 Jun", score: overall },
  ],
  notes: [
    {
      author: "Mr. Jean",
      date: "2 days ago",
      text: "Engaged during group work; struggles with algebraic fractions.",
    },
  ],
  recommendations: [
    `Focus 20 minutes daily on ${weakest} fundamentals.`,
    "Pair with a peer tutor for two weeks.",
    "Re-attempt Assessment 3 questions 4–7 with guided steps.",
  ],
});

export const students: Student[] = [
  mk("alex-uwase", "Alex Uwase", "S3 Mathematics", 72, 91, "up", "improving", "Mathematics"),
  mk("aline-mukamana", "Aline Mukamana", "S3 Mathematics", 84, 96, "up", "on-track", "Physics"),
  mk("eric-habimana", "Eric Habimana", "S3 Mathematics", 51, 78, "down", "support", "Mathematics"),
  mk(
    "claudine-iradukunda",
    "Claudine Iradukunda",
    "S3 Mathematics",
    45,
    68,
    "down",
    "risk",
    "English",
  ),
  mk("kevin-ndayisaba", "Kevin Ndayisaba", "S3 Mathematics", 66, 88, "flat", "on-track", "Biology"),
  mk(
    "diane-nishimwe",
    "Diane Nishimwe",
    "S3 Mathematics",
    58,
    82,
    "up",
    "improving",
    "Mathematics",
  ),
  mk(
    "patrick-gasana",
    "Patrick Gasana",
    "S3 Mathematics",
    77,
    93,
    "flat",
    "on-track",
    "Kinyarwanda",
  ),
  mk("sandrine-keza", "Sandrine Keza", "S3 Mathematics", 49, 71, "down", "support", "Physics"),
];

export const metrics = {
  students: 42,
  avgScore: 67,
  attendance: 89,
  needSupport: 5,
  avgDelta: 4.2,
  attendanceDelta: -1.1,
};

export const supportStatus = [
  { key: "on-track" as StudentStatus, label: "On Track", count: 29 },
  { key: "improving" as StudentStatus, label: "Improving", count: 8 },
  { key: "support" as StudentStatus, label: "Need Support", count: 5 },
  { key: "risk" as StudentStatus, label: "At Risk", count: 2 },
];

export const performanceTrend = [
  { period: "Feb", math: 61, english: 68, physics: 58 },
  { period: "Mar", math: 63, english: 70, physics: 60 },
  { period: "Apr", math: 66, english: 71, physics: 63 },
  { period: "May", math: 62, english: 73, physics: 65 },
  { period: "Jun", math: 58, english: 74, physics: 67 },
  { period: "Jul", math: 60, english: 76, physics: 69 },
];

export const subjectAverages = subjects.map((s, i) => ({
  subject: s,
  average: [58, 74, 67, 71, 80][i],
}));

export const attendanceByWeek = [
  { week: "W1", attendance: 92 },
  { week: "W2", attendance: 90 },
  { week: "W3", attendance: 87 },
  { week: "W4", attendance: 89 },
  { week: "W5", attendance: 91 },
  { week: "W6", attendance: 89 },
];

export const notifications = [
  {
    id: "n1",
    title: "New support alert",
    body: "Mathematics performance has dropped for 3 students.",
    time: "2 minutes ago",
    tone: "warning" as const,
    unread: true,
  },
  {
    id: "n2",
    title: "Study plan generated",
    body: "Umwarimu AI created a 2-week plan for Eric Habimana.",
    time: "1 hour ago",
    tone: "accent" as const,
    unread: true,
  },
  {
    id: "n3",
    title: "Attendance improving",
    body: "S3 attendance is up 2% compared with last week.",
    time: "Yesterday",
    tone: "success" as const,
    unread: false,
  },
  {
    id: "n4",
    title: "Automation completed",
    body: "Weekly parent digest sent to 38 guardians via workflow.",
    time: "2 days ago",
    tone: "accent" as const,
    unread: false,
  },
];

export const activity = [
  { text: "Assessment 3 marks imported for S3 Mathematics", time: "18 min ago" },
  { text: "Aline Mukamana completed AI Tutor practice set", time: "42 min ago" },
  { text: "Support plan reviewed for Sandrine Keza", time: "2 hours ago" },
  { text: "Kinyarwanda tutoring session logged", time: "5 hours ago" },
];

export const statusStyles: Record<StudentStatus, { label: string; color: string; bg: string }> = {
  "on-track": { label: "On Track", color: "text-success", bg: "bg-success/12 border-success/30" },
  improving: { label: "Improving", color: "text-primary", bg: "bg-primary/12 border-primary/30" },
  support: { label: "Need Support", color: "text-warning", bg: "bg-warning/12 border-warning/30" },
  risk: { label: "At Risk", color: "text-risk", bg: "bg-risk/12 border-risk/30" },
};
