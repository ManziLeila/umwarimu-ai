// Network-admin (platform-wide) oversight — separate from a school's own
// admin, who only ever sees their own school. Role gating happens in Node
// (see src/lib/network.functions.ts); this module just reads/writes across
// every school in the Master Registry.

import {
  deleteSchoolRow,
  deleteStaffRowsForSchool,
  deleteStudentAccountRowsForSchool,
  findSchoolById,
  listSchools,
  listStaff,
} from "./registry";
import { readActiveStudents } from "./schoolData";
import type { SchoolRow } from "./types";

export interface SchoolWithStats extends SchoolRow {
  studentCount: number;
  staffCount: number;
}

export function listSchoolsWithStats(): SchoolWithStats[] {
  const staff = listStaff();
  return listSchools().map((school) => {
    let studentCount = 0;
    try {
      const ss = SpreadsheetApp.openById(school.spreadsheetId);
      studentCount = readActiveStudents(ss).length;
    } catch {
      // Spreadsheet inaccessible/deleted — report 0 rather than failing the
      // whole overview for every other school.
    }
    return {
      ...school,
      studentCount,
      staffCount: staff.filter((s) => s.schoolId === school.schoolId).length,
    };
  });
}

export interface DeleteSchoolResult {
  schoolId: string;
  staffRemoved: number;
  studentAccountsRemoved: number;
  trashedFiles: string[];
  trashErrors: string[];
}

/** Network-admin only (see requireNetworkAdminSession in the Node caller):
 * removes a school from the registry entirely — its Staff/StudentAccounts
 * rows, and the Schools row itself. The school's own spreadsheet (with all
 * its Students/Scores/Attendance data) and both Forms are moved to Drive
 * trash rather than permanently deleted — recoverable for Drive's normal
 * retention window if this was run by mistake, rather than gone outright. */
export function deleteSchool(schoolId: string): DeleteSchoolResult {
  const school = findSchoolById(schoolId);
  if (!school) throw new Error(`Unknown school "${schoolId}".`);

  const trashedFiles: string[] = [];
  const trashErrors: string[] = [];
  for (const fileId of [school.spreadsheetId, school.scoresFormId, school.attendanceFormId]) {
    if (!fileId) continue;
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
      trashedFiles.push(fileId);
    } catch (err) {
      trashErrors.push(`${fileId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const staffRemoved = deleteStaffRowsForSchool(schoolId);
  const studentAccountsRemoved = deleteStudentAccountRowsForSchool(schoolId);
  deleteSchoolRow(schoolId);

  return { schoolId, staffRemoved, studentAccountsRemoved, trashedFiles, trashErrors };
}
