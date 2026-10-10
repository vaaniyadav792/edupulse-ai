import type { Student } from "./types";

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export function toCSV(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((r) => r.map((v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","))
    .join("\n");
}

export function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type FieldKey = Exclude<keyof Student, "source">;
export interface FieldDef { key: FieldKey; label: string; required?: boolean; type: "string" | "number"; min?: number; max?: number; aliases: string[] }

export const FIELDS: FieldDef[] = [
  { key: "id", label: "Student ID", required: true, type: "string", aliases: ["id", "studentid", "rollno", "roll"] },
  { key: "name", label: "Name", type: "string", aliases: ["name", "studentname", "fullname"] },
  { key: "department", label: "Department", required: true, type: "string", aliases: ["department", "dept", "branch"] },
  { key: "year", label: "Academic year", required: true, type: "number", min: 1, max: 5, aliases: ["year", "academicyear", "yr"] },
  { key: "cgpa", label: "CGPA (0–10)", type: "number", min: 0, max: 10, aliases: ["cgpa", "gpa"] },
  { key: "prevCgpa", label: "Previous CGPA", type: "number", min: 0, max: 10, aliases: ["prevcgpa", "previouscgpa", "lastcgpa"] },
  { key: "backlogs", label: "Backlogs", type: "number", min: 0, max: 30, aliases: ["backlogs", "arrears"] },
  { key: "attendance", label: "Attendance %", type: "number", min: 0, max: 100, aliases: ["attendance", "attendancepct"] },
  { key: "assignmentCompletion", label: "Assignment completion %", type: "number", min: 0, max: 100, aliases: ["assignmentcompletion", "assignments", "assignment"] },
  { key: "lmsLogins", label: "LMS logins / month", type: "number", min: 0, max: 500, aliases: ["lmslogins", "lms", "logins"] },
  { key: "engagement", label: "Engagement (0–100)", type: "number", min: 0, max: 100, aliases: ["engagement", "participation"] },
  { key: "aptitude", label: "Aptitude (0–100)", type: "number", min: 0, max: 100, aliases: ["aptitude"] },
  { key: "coding", label: "Coding (0–100)", type: "number", min: 0, max: 100, aliases: ["coding"] },
  { key: "mockInterview", label: "Mock interview (0–100)", type: "number", min: 0, max: 100, aliases: ["mockinterview", "mock"] },
  { key: "softSkills", label: "Soft skills (0–100)", type: "number", min: 0, max: 100, aliases: ["softskills", "soft"] },
  { key: "placementTraining", label: "Placement training %", type: "number", min: 0, max: 100, aliases: ["placementtraining", "training"] },
  { key: "certifications", label: "Certifications (count)", type: "number", min: 0, max: 50, aliases: ["certifications", "certs"] },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function autoMap(headers: string[]): Record<string, number> {
  const m: Record<string, number> = {};
  FIELDS.forEach((f) => {
    const idx = headers.findIndex((h) => f.aliases.includes(norm(h)) || norm(h) === norm(f.key));
    if (idx >= 0) m[f.key] = idx;
  });
  return m;
}

export function validateRow(row: string[], mapping: Record<string, number>): { student: Student | null; errors: string[] } {
  const errors: string[] = [];
  const s: Record<string, unknown> = { source: "imported" };
  for (const f of FIELDS) {
    const idx = mapping[f.key];
    const raw = idx === undefined || idx < 0 ? "" : (row[idx] ?? "").trim();
    if (raw === "") {
      if (f.required) errors.push(`${f.label} is required`);
      s[f.key] = f.type === "string" ? (f.key === "name" ? "" : "") : null;
      continue;
    }
    if (f.type === "string") { s[f.key] = raw; continue; }
    const n = Number(raw);
    if (Number.isNaN(n)) { errors.push(`${f.label}: "${raw}" is not a number`); continue; }
    if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) { errors.push(`${f.label}: ${n} outside ${f.min}–${f.max}`); continue; }
    s[f.key] = n;
  }
  if (!s.name) s.name = String(s.id ?? "");
  if (errors.length) return { student: null, errors };
  s.department = String(s.department).toUpperCase();
  s.year = Math.round(s.year as number);
  return { student: s as unknown as Student, errors };
}

export function templateCSV() {
  return toCSV([
    FIELDS.map((f) => f.key),
    ["STU9001", "Sample Student", "CSE", 3, 7.8, 7.5, 0, 88, 92, 30, 75, 70, 82, 68, 74, 85, 3],
  ]);
}
