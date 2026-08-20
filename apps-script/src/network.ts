// Network-admin (platform-wide) oversight — separate from a school's own
// admin, who only ever sees their own school. Role gating happens in Node
// (see src/lib/network.functions.ts); this module just reads/writes across
// every school in the Master Registry.

import { listSchools, listStaff } from "./registry";
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
