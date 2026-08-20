import { scopeToClasses } from "../src/entry";
import type { Student } from "../src/types";

function student(id: string, className: string): Student {
  return {
    studentId: id,
    name: id,
    className,
    guardianName: "",
    guardianEmail: "",
    status: "active",
  };
}

describe("scopeToClasses", () => {
  const students = [student("s1", "S3 Mathematics"), student("s2", "S3 English")];

  it("returns every student when allowedClasses is empty (admin view)", () => {
    expect(scopeToClasses(students, [])).toEqual(students);
  });

  it("filters to only the given classes", () => {
    expect(scopeToClasses(students, ["S3 Mathematics"])).toEqual([students[0]]);
  });

  it("returns nothing when no student matches", () => {
    expect(scopeToClasses(students, ["S4 Physics"])).toEqual([]);
  });
});
