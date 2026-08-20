// Direct messaging between a student and their class teacher(s) — a real
// per-school "Messages" sheet, scoped the same way marks/attendance entry
// already is: a teacher only ever sees threads for students in their own
// class(es); admin/network-admin (classes: []) see every thread.

import { scopeToClasses } from "./entry";
import { readActiveStudents } from "./schoolData";
import { appendObjectRow, getHeaders, getOrCreateSheet, readRowsAsObjects } from "./sheetAccess";

export const MESSAGES_SHEET = "Messages";
export const MESSAGES_HEADERS = [
  "id",
  "studentId",
  "className",
  "senderRole",
  "senderName",
  "senderUsername",
  "text",
  "createdAt",
];

export interface MessageRow {
  id: string;
  studentId: string;
  className: string;
  senderRole: "student" | "teacher";
  senderName: string;
  senderUsername: string;
  text: string;
  createdAt: string;
}

function getMessagesSheet(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
): GoogleAppsScript.Spreadsheet.Sheet {
  return getOrCreateSheet(ss, MESSAGES_SHEET, MESSAGES_HEADERS);
}

export function sendMessage(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  input: Omit<MessageRow, "id" | "createdAt">,
): MessageRow {
  const sheet = getMessagesSheet(ss);
  const row: MessageRow = {
    ...input,
    id: Utilities.getUuid(),
    createdAt: new Date().toISOString(),
  };
  appendObjectRow(sheet, getHeaders(sheet), row as unknown as Record<string, unknown>);
  return row;
}

export function listMessagesForStudent(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  studentId: string,
): MessageRow[] {
  const sheet = getMessagesSheet(ss);
  return readRowsAsObjects<MessageRow>(sheet)
    .filter((m) => String(m.studentId) === studentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export interface MessageThread {
  studentId: string;
  studentName: string;
  className: string;
  lastMessage: string;
  lastMessageAt: string;
  messages: MessageRow[];
}

/** For a teacher/admin inbox — one thread per student they're allowed to
 * see, newest-active thread first. */
export function listMessageThreads(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  allowedClasses: string[],
): MessageThread[] {
  const students = scopeToClasses(readActiveStudents(ss), allowedClasses);
  const byId = new Map(students.map((s) => [s.studentId, s] as const));

  const sheet = getMessagesSheet(ss);
  const grouped = new Map<string, MessageRow[]>();
  readRowsAsObjects<MessageRow>(sheet)
    .filter((m) => byId.has(String(m.studentId)))
    .forEach((m) => {
      const key = String(m.studentId);
      const list = grouped.get(key) ?? [];
      list.push(m);
      grouped.set(key, list);
    });

  return Array.from(grouped.entries())
    .map(([studentId, rawMessages]) => {
      const messages = rawMessages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const last = messages[messages.length - 1];
      const student = byId.get(studentId);
      return {
        studentId,
        studentName: student?.name ?? studentId,
        className: student?.className ?? "",
        lastMessage: last?.text ?? "",
        lastMessageAt: last?.createdAt ?? "",
        messages,
      };
    })
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}
