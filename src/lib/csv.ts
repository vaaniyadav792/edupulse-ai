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
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke later: revoking immediately cancels the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
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
  { key: "courseCompletion", label: "Course completion %", type: "number", min: 0, max: 100, aliases: ["coursecompletion", "coursecompletionpercentage"] },
  { key: "placementAssessment", label: "Placement assessment (0–100)", type: "number", min: 0, max: 100, aliases: ["placementassessment", "placementreadinessscore", "placementscore"] },
  { key: "atRiskLabel", label: "At-risk label (0/1, for ML training)", type: "number", min: 0, max: 1, aliases: ["atrisklabel", "atrisk", "label"] },
];

/**
 * Recognises the "Student Journey Analytics" export format and converts it to the
 * app's canonical columns. Sensitive columns (age, financial aid, fee status,
 * wellbeing) are deliberately dropped and never used for scoring or ML.
 */
export function normalizeKnownSchema(headers: string[], rows: string[][]): { headers: string[]; rows: string[][]; detected: string | null } {
  const idx = (h: string) => headers.findIndex((x) => x.trim() === h);
  if (idx("Internal_Assessment_1") < 0 || idx("Semester") < 0 || idx("Student_ID") < 0) return { headers, rows, detected: null };
  const num = (r: string[], h: string) => { const i = idx(h); const v = i < 0 ? NaN : Number(r[i]); return Number.isNaN(v) || r[i]?.trim() === "" ? null : v; };
  const out = ["id", "name", "department", "year", "cgpa", "prevCgpa", "attendance", "assignmentCompletion", "lmsLogins", "courseCompletion", "engagement", "placementAssessment", "placementTraining", "atRiskLabel"];
  const r1 = (v: number | null, d = 1) => (v === null ? "" : String(+v.toFixed(d)));
  const mapped = rows.map((r) => {
    const sem = num(r, "Semester");
    const ia1 = num(r, "Internal_Assessment_1"), ia2 = num(r, "Internal_Assessment_2"), end = num(r, "End_Semester_Exam_Score");
    const cgpa = ia1 !== null && ia2 !== null && end !== null ? (0.2 * ia1 + 0.2 * ia2 + 0.6 * end) / 10 : null;
    const logins = num(r, "LMS_Logins_Per_Week");
    const hours = num(r, "Extracurricular_Hours_Per_Month");
    const part = (r[idx("Extracurricular_Participation")] ?? "").trim().toLowerCase() === "yes";
    const engagement = hours === null ? null : Math.min(100, (part ? 30 : 0) + hours * 7);
    const sessions = num(r, "Placement_Sessions_Attended");
    const id = (r[idx("Student_ID")] ?? "").trim();
    return [
      id, id, (r[idx("Department")] ?? "").trim(), sem === null ? "" : String(Math.min(5, Math.ceil(sem / 2))),
      r1(cgpa, 2), r1(num(r, "Previous_Semester_GPA_10"), 2), r1(num(r, "Attendance_Percentage")), r1(num(r, "Assignment_Average")),
      logins === null ? "" : String(logins * 4), r1(num(r, "Course_Completion_Percentage")), r1(engagement),
      r1(num(r, "Placement_Readiness_Score")), sessions === null ? "" : String(Math.min(100, sessions * 12.5)), r1(num(r, "At_Risk_Label"), 0),
    ];
  });
  return { headers: out, rows: mapped, detected: "Student Journey Analytics" };
}

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
  const s: any = { source: "imported" }; // eslint-disable-line @typescript-eslint/no-explicit-any
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

/** Full pipeline: parse → normalize known schema → auto-map → validate. */
export function studentsFromCSVText(text: string) {
  const raw = parseCSV(text);
  if (raw.length < 2) throw new Error("The file needs a header row and at least one data row.");
  const n = normalizeKnownSchema(raw[0]!.map((h) => h.trim()), raw.slice(1));
  const mapping = autoMap(n.headers);
  const res = n.rows.map((r) => validateRow(r, mapping));
  return { students: res.flatMap((r) => (r.student ? [r.student] : [])), invalid: res.filter((r) => !r.student).length };
}
