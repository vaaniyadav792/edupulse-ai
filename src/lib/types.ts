export type Num = number | null;

export interface Student {
  id: string;
  name: string;
  department: string;
  year: number;
  cgpa: Num; // 0-10
  prevCgpa: Num; // previous term CGPA, for trend
  backlogs: Num;
  attendance: Num; // %
  assignmentCompletion: Num; // %
  lmsLogins: Num; // logins / month
  engagement: Num; // participation 0-100
  aptitude: Num;
  coding: Num;
  mockInterview: Num;
  softSkills: Num;
  placementTraining: Num; // % sessions attended
  certifications: Num; // count
  source: "synthetic" | "imported";
}

export type Category = "On Track" | "Monitor" | "Needs Attention" | "High Priority" | "Insufficient Data";
export type AcademicRisk = "High" | "Moderate" | "Low";

export interface RiskFlag {
  key: string;
  kind: "academic" | "placement";
  label: string;
  indicator: string;
  action: string;
  interventionType: InterventionType;
}

export interface StudentView extends Student {
  success: Num;
  completeness: number; // 0-1
  components: Record<"academic" | "attendance" | "lms" | "placement" | "skills" | "engagement", Num>;
  category: Category;
  readiness: Num;
  readinessCompleteness: number;
  flags: RiskFlag[];
  academicRisk: AcademicRisk;
  lowPlacement: boolean;
}

export const INTERVENTION_TYPES = [
  "Academic Mentoring",
  "Attendance Follow-up",
  "Tutoring",
  "Aptitude Practice",
  "Coding Practice",
  "Mock Interview Prep",
] as const;
export type InterventionType = (typeof INTERVENTION_TYPES)[number];

export const INTERVENTION_STATUSES = ["Planned", "In Progress", "Completed", "Cancelled"] as const;
export type InterventionStatus = (typeof INTERVENTION_STATUSES)[number];

export interface Intervention {
  id: string;
  studentId: string;
  type: InterventionType;
  mentor: string;
  dueDate: string;
  notes: string;
  status: InterventionStatus;
  createdAt: string;
}
