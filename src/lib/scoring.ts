import type { AcademicRisk, Category, Num, RiskFlag, Student, StudentView } from "./types";

export const WEIGHTS = {
  academic: 0.3,
  attendance: 0.2,
  lms: 0.15,
  placement: 0.2,
  skills: 0.1,
  engagement: 0.05,
} as const;
export type ComponentKey = keyof typeof WEIGHTS;
export const COMPONENT_LABELS: Record<ComponentKey, string> = {
  academic: "Academic performance",
  attendance: "Attendance",
  lms: "LMS & assignments",
  placement: "Placement readiness",
  skills: "Skills & certifications",
  engagement: "Engagement",
};

export const READINESS_WEIGHTS = {
  aptitude: 0.25,
  coding: 0.25,
  mockInterview: 0.25,
  softSkills: 0.15,
  placementTraining: 0.1,
} as const;

export const THRESHOLDS = {
  attendance: 75,
  cgpa: 6,
  decline: 0.5,
  assignment: 60,
  lmsLogins: 10,
  readiness: 50,
  assessment: 40,
};

const clamp = (v: number) => Math.max(0, Math.min(100, v));
const has = (v: Num | undefined): v is number => v !== null && v !== undefined && !Number.isNaN(v);

/** Weighted average of available values; weights of missing values are renormalized away. */
export function weighted(parts: { value: Num; weight: number }[]) {
  const total = parts.reduce((a, p) => a + p.weight, 0);
  const avail = parts.filter((p) => has(p.value));
  const w = avail.reduce((a, p) => a + p.weight, 0);
  if (w === 0) return { score: null as Num, completeness: 0 };
  const score = avail.reduce((a, p) => a + (p.value as number) * p.weight, 0) / w;
  return { score: Math.round(score * 10) / 10, completeness: w / total };
}

export function placementReadiness(s: Partial<Student>) {
  return weighted(
    (Object.keys(READINESS_WEIGHTS) as (keyof typeof READINESS_WEIGHTS)[]).map((k) => ({
      value: has(s[k]) ? clamp(s[k] as number) : null,
      weight: READINESS_WEIGHTS[k],
    })),
  );
}

export function components(s: Partial<Student>): Record<ComponentKey, Num> {
  const academic = has(s.cgpa) ? clamp(s.cgpa * 10 - Math.min((s.backlogs ?? 0) * 5, 20)) : null;
  const lmsParts = [
    has(s.assignmentCompletion) ? clamp(s.assignmentCompletion) : null,
    has(s.lmsLogins) ? clamp((s.lmsLogins / 40) * 100) : null,
  ].filter(has);
  return {
    academic,
    attendance: has(s.attendance) ? clamp(s.attendance) : null,
    lms: lmsParts.length ? lmsParts.reduce((a, b) => a + b, 0) / lmsParts.length : null,
    placement: placementReadiness(s).score,
    skills: has(s.certifications) ? clamp(s.certifications * 20) : null,
    engagement: has(s.engagement) ? clamp(s.engagement) : null,
  };
}

export function categorize(score: Num): Category {
  if (score === null) return "Insufficient Data";
  if (score >= 80) return "On Track";
  if (score >= 60) return "Monitor";
  if (score >= 40) return "Needs Attention";
  return "High Priority";
}

export function successScore(s: Partial<Student>) {
  const c = components(s);
  const r = weighted((Object.keys(WEIGHTS) as ComponentKey[]).map((k) => ({ value: c[k], weight: WEIGHTS[k] })));
  return { ...r, components: c, category: categorize(r.score) };
}

export function riskFlags(s: Partial<Student>, readiness: Num): RiskFlag[] {
  const f: RiskFlag[] = [];
  const T = THRESHOLDS;
  if (has(s.attendance) && s.attendance < T.attendance)
    f.push({ key: "attendance", kind: "academic", label: "Low attendance", indicator: `Attendance ${s.attendance.toFixed(0)}% (< ${T.attendance}%)`, action: "Attendance follow-up call with student and guardian; weekly check-ins.", interventionType: "Attendance Follow-up" });
  if (has(s.cgpa) && s.cgpa < T.cgpa)
    f.push({ key: "cgpa", kind: "academic", label: "Poor marks", indicator: `CGPA ${s.cgpa.toFixed(2)} (< ${T.cgpa})`, action: "Assign an academic mentor and a subject tutoring plan.", interventionType: "Academic Mentoring" });
  if (has(s.cgpa) && has(s.prevCgpa) && s.prevCgpa - s.cgpa >= T.decline)
    f.push({ key: "decline", kind: "academic", label: "Declining marks", indicator: `CGPA fell ${s.prevCgpa.toFixed(2)} → ${s.cgpa.toFixed(2)}`, action: "Mentor review to identify causes of the decline.", interventionType: "Academic Mentoring" });
  if (has(s.backlogs) && s.backlogs > 0)
    f.push({ key: "backlogs", kind: "academic", label: "Backlogs", indicator: `${s.backlogs} pending backlog(s)`, action: "Enroll in remedial tutoring before re-examination.", interventionType: "Tutoring" });
  if (has(s.assignmentCompletion) && s.assignmentCompletion < T.assignment)
    f.push({ key: "assignment", kind: "academic", label: "Low assignment completion", indicator: `Assignments ${s.assignmentCompletion.toFixed(0)}% (< ${T.assignment}%)`, action: "Set a supervised assignment-completion schedule.", interventionType: "Tutoring" });
  if (has(s.lmsLogins) && s.lmsLogins < T.lmsLogins)
    f.push({ key: "lms", kind: "academic", label: "Low LMS activity", indicator: `${s.lmsLogins} LMS logins/month (< ${T.lmsLogins})`, action: "Mentor nudge and LMS orientation session.", interventionType: "Academic Mentoring" });
  const weak: string[] = [];
  if (has(s.aptitude) && s.aptitude < T.assessment) weak.push(`aptitude ${s.aptitude}`);
  if (has(s.coding) && s.coding < T.assessment) weak.push(`coding ${s.coding}`);
  if (has(s.mockInterview) && s.mockInterview < T.assessment) weak.push(`mock interview ${s.mockInterview}`);
  if ((readiness !== null && readiness < T.readiness) || weak.length) {
    const type = has(s.coding) && s.coding < T.assessment ? "Coding Practice" : has(s.aptitude) && s.aptitude < T.assessment ? "Aptitude Practice" : "Mock Interview Prep";
    f.push({
      key: "placement",
      kind: "placement",
      label: "Weak placement assessments",
      indicator: [readiness !== null ? `Readiness ${readiness.toFixed(0)}` : null, ...weak].filter(Boolean).join(", "),
      action: `Enroll in ${type.toLowerCase()} sessions with the placement cell.`,
      interventionType: type,
    });
  }
  return f;
}

export function academicRiskLevel(flags: RiskFlag[]): AcademicRisk {
  const n = flags.filter((f) => f.kind === "academic").length;
  return n >= 3 ? "High" : n === 2 ? "Moderate" : "Low";
}

export function evaluate(s: Student): StudentView {
  const ss = successScore(s);
  const pr = placementReadiness(s);
  const flags = riskFlags(s, pr.score);
  return {
    ...s,
    success: ss.score,
    completeness: ss.completeness,
    components: ss.components,
    category: ss.category,
    readiness: pr.score,
    readinessCompleteness: pr.completeness,
    flags,
    academicRisk: academicRiskLevel(flags),
    lowPlacement: pr.score !== null && pr.score < THRESHOLDS.readiness,
  };
}

export const mean = (xs: Num[]) => {
  const v = xs.filter(has);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
