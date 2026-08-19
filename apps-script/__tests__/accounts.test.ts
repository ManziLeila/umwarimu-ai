import { parseClasses } from "../src/accounts";

describe("parseClasses", () => {
  it("splits and trims a comma-separated list", () => {
    expect(parseClasses("S3 Mathematics, S3 English")).toEqual(["S3 Mathematics", "S3 English"]);
  });

  it("returns an empty array for an empty string (admin scope)", () => {
    expect(parseClasses("")).toEqual([]);
  });

  it("drops empty segments from trailing/double commas", () => {
    expect(parseClasses("S3 Mathematics,,S3 English,")).toEqual(["S3 Mathematics", "S3 English"]);
  });
});
