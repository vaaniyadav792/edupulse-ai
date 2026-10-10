import { describe, expect, it } from "vitest";
import { categorize, evaluate, placementReadiness, successScore, weighted } from "@/lib/scoring";
import { generateDemoStudents } from "@/lib/demo-data";
import type { Student } from "@/lib/types";

const base: Student = {
  id: "T1", name: "T", department: "CSE", year: 3, cgpa: 8, prevCgpa: 8, backlogs: 0, attendance: 80,
  assignmentCompletion: 80, lmsLogins: 32, engagement: 80, aptitude: 80, coding: 80, mockInterview: 80,
  softSkills: 80, placementTraining: 80, certifications: 4, source: "synthetic",
};

describe("scoring", () => {
  it("weights all components at 80 into a score of 80", () => {
    expect(successScore(base).score).toBe(80);
  });
  it("categorizes using the 80/60/40 bands", () => {
    expect(categorize(80)).toBe("On Track");
    expect(categorize(79.9)).toBe("Monitor");
    expect(categorize(40)).toBe("Needs Attention");
    expect(categorize(39)).toBe("High Priority");
  });
  it("renormalizes missing weights and reports completeness", () => {
    const r = weighted([{ value: 100, weight: 0.3 }, { value: null, weight: 0.2 }]);
    expect(r.score).toBe(100);
    expect(r.completeness).toBeCloseTo(0.6);
  });
  it("placement readiness ignores missing mock interview", () => {
    expect(placementReadiness({ ...base, mockInterview: null }).completeness).toBeCloseTo(0.75);
  });
  it("flags attendance below 75%", () => {
    expect(evaluate({ ...base, attendance: 70 }).flags.map((f) => f.key)).toContain("attendance");
  });
  it("generates at least 100 deterministic synthetic students", () => {
    const a = generateDemoStudents();
    expect(a.length).toBeGreaterThanOrEqual(100);
    expect(generateDemoStudents()[5]).toEqual(a[5]);
  });
});
