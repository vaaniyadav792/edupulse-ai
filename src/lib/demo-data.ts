import type { Intervention, Student } from "./types";

/**
 * SYNTHETIC DEMO DATA. Generated deterministically from a fixed seed so every
 * load produces the same fictional students. No real people are represented.
 */
export const DEPARTMENTS = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"];
const FIRST = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Isha", "Vihaan", "Anaya", "Arjun", "Sara", "Neel", "Tara", "Dev", "Riya", "Kian", "Zoya", "Om", "Lina", "Yash", "Myra"];
const LAST = ["Rao", "Shah", "Iyer", "Das", "Nair", "Mehta", "Bose", "Patel", "Gill", "Menon", "Joshi", "Sen"];

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDemoStudents(count = 120): Student[] {
  const r = mulberry32(20261010);
  const g = () => (r() + r() + r() - 1.5) * 2; // approx N(0,1)
  const c = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
  const out: Student[] = [];
  for (let i = 0; i < count; i++) {
    const dept = DEPARTMENTS[i % DEPARTMENTS.length];
    const year = 1 + (Math.floor(i / DEPARTMENTS.length) % 4);
    const ability = g();
    const diligence = g();
    const placementSkill = 0.5 * ability + 0.5 * g();
    const cgpa = +c(6.9 + 1.1 * ability + 0.35 * diligence, 4, 9.9).toFixed(2);
    const prevCgpa = year > 1 ? +c(cgpa + g() * 0.45, 4, 10).toFixed(2) : null;
    const codingBoost = dept === "CSE" || dept === "IT" ? 8 : 0;
    const s: Student = {
      id: `STU${String(1001 + i)}`,
      name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`,
      department: dept,
      year,
      cgpa,
      prevCgpa,
      backlogs: cgpa < 6 ? 1 + Math.floor(r() * 3) : cgpa < 6.8 && r() < 0.3 ? 1 : 0,
      attendance: Math.round(c(81 + 10 * diligence + 3 * ability, 42, 100)),
      assignmentCompletion: Math.round(c(76 + 15 * diligence + 5 * ability, 20, 100)),
      lmsLogins: Math.round(c(24 + 9 * diligence + g() * 5, 1, 60)),
      engagement: Math.round(c(64 + 12 * g() + 6 * diligence, 10, 100)),
      aptitude: Math.round(c(61 + 14 * placementSkill + g() * 5, 15, 100)),
      coding: Math.round(c(56 + codingBoost + 15 * placementSkill + g() * 6, 10, 100)),
      mockInterview: year === 1 ? null : Math.round(c(60 + 12 * placementSkill + 6 * g(), 15, 100)),
      softSkills: Math.round(c(66 + 10 * g(), 20, 100)),
      placementTraining: Math.round(c(70 + 15 * diligence, 10, 100)),
      certifications: Math.round(c(1 + 1.4 * placementSkill + year * 0.5 + r(), 0, 8)),
      source: "synthetic",
    };
    // A few deliberately missing values to demonstrate weight renormalization.
    if (r() < 0.05) s.softSkills = null;
    if (r() < 0.04) s.lmsLogins = null;
    if (r() < 0.03) s.engagement = null;
    out.push(s);
  }
  return out;
}

export function demoInterventions(): Intervention[] {
  const base: [string, Intervention["type"], string, Intervention["status"], string][] = [
    ["STU1003", "Attendance Follow-up", "Dr. K. Varma", "In Progress", "Called guardian; weekly check-ins started."],
    ["STU1010", "Academic Mentoring", "Prof. S. Pillai", "Planned", "Review mid-term results together."],
    ["STU1021", "Coding Practice", "Ms. A. Kulkarni", "In Progress", "Assigned 20 DSA problems on the practice portal."],
    ["STU1034", "Mock Interview Prep", "Mr. R. Thomas", "Completed", "Two mock rounds done; communication improved."],
    ["STU1047", "Tutoring", "Dr. P. Ghosh", "Planned", "Remedial maths sessions, Tue/Thu."],
  ];
  return base.map(([studentId, type, mentor, status, notes], i) => ({
    id: `INT-${100 + i}`,
    studentId,
    type,
    mentor,
    status,
    notes,
    dueDate: `2026-11-${String(5 + i * 4).padStart(2, "0")}`,
    createdAt: "2026-10-01T09:00:00.000Z",
  }));
}
