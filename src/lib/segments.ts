import type { StudentView } from "./types";

export interface Segment {
  id: string;
  name: string;
  description: string;
  rule: string;
  test: (s: StudentView) => boolean;
}

export const SEGMENTS: Segment[] = [
  { id: "high-acad-low-placement", name: "High academics, low placement readiness", description: "Strong grades but not yet interview-ready.", rule: "CGPA ≥ 8 and Readiness < 55", test: (s) => (s.cgpa ?? 0) >= 8 && s.readiness !== null && s.readiness < 55 },
  { id: "low-att-low-acad", name: "Low attendance & low academics", description: "Disengaged students with weak results.", rule: "Attendance < 75% and CGPA < 6.5", test: (s) => s.attendance !== null && s.attendance < 75 && s.cgpa !== null && s.cgpa < 6.5 },
  { id: "engaged-improving", name: "Strong engagement & improving", description: "Active participants whose CGPA is rising.", rule: "Engagement ≥ 70 and CGPA up ≥ 0.3", test: (s) => (s.engagement ?? 0) >= 70 && s.cgpa !== null && s.prevCgpa !== null && s.cgpa - s.prevCgpa >= 0.3 },
  { id: "strong-low-lms", name: "Academically strong, low LMS use", description: "Good grades but rarely use the LMS.", rule: "CGPA ≥ 8 and LMS logins < 18/month", test: (s) => (s.cgpa ?? 0) >= 8 && s.lmsLogins !== null && s.lmsLogins < 18 },
  { id: "on-track", name: "On Track", description: "Success Score of 80 or above.", rule: "Category = On Track", test: (s) => s.category === "On Track" },
  { id: "targeted", name: "Needs Targeted Support", description: "Success Score below 60.", rule: "Category = Needs Attention or High Priority", test: (s) => s.category === "Needs Attention" || s.category === "High Priority" },
];
