// Minimal CSV helpers — no library needed for a format we control ourselves
// (a fixed, known header row). Handles basic double-quote escaping so a
// name or guardian field with a comma in it still round-trips correctly.

export function toCsv(headers: string[], rows: Array<Record<string, string>> = []): string {
  const escape = (value: string): string =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  const lines = [headers.map(escape).join(",")];
  rows.forEach((row) => lines.push(headers.map((h) => escape(row[h] ?? "")).join(",")));
  return lines.join("\r\n");
}

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];
  const headers = parseLine(lines[0]!).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (values[i] ?? "").trim()));
    return row;
  });
}
