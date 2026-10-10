import type { Num, Student } from "./types";

/**
 * Logistic regression trained in the browser on records that carry a ground-truth
 * `atRiskLabel` (0/1). Deterministic: zero-initialised weights, full-batch gradient
 * descent, fixed 80/20 split (every 5th labelled record is held out for testing).
 * Only academic/engagement/placement indicators are used — no age, finance, fee,
 * wellbeing or other sensitive attributes.
 */
export const ML_FEATURES = [
  { key: "cgpa", label: "Current CGPA" },
  { key: "prevCgpa", label: "Previous GPA" },
  { key: "attendance", label: "Attendance" },
  { key: "assignmentCompletion", label: "Assignments" },
  { key: "lmsLogins", label: "LMS logins" },
  { key: "courseCompletion", label: "Course completion" },
  { key: "engagement", label: "Engagement" },
  { key: "placementAssessment", label: "Placement assessment" },
  { key: "placementTraining", label: "Placement training" },
] as const;
type FKey = (typeof ML_FEATURES)[number]["key"];

export interface Model {
  features: FKey[];
  means: number[];
  stds: number[];
  weights: number[];
  bias: number;
  threshold: number;
  trainSize: number;
  testSize: number;
  metrics: { accuracy: number; precision: number; recall: number; f1: number; auc: number };
  confusion: { tp: number; fp: number; tn: number; fn: number };
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

function vector(s: Partial<Student>, feats: FKey[], means: number[], stds: number[]) {
  return feats.map((k, i) => {
    const v = s[k];
    const x = v === null || v === undefined || Number.isNaN(v) ? means[i]! : (v as number);
    return (x - means[i]!) / stds[i]!;
  });
}

export function predict(m: Model, s: Partial<Student>): number {
  const x = vector(s, m.features, m.means, m.stds);
  return sigmoid(x.reduce((a, v, i) => a + v * m.weights[i]!, m.bias));
}

function auc(scores: number[], labels: number[]) {
  const pairs = scores.map((s, i) => [s, labels[i]!] as const).sort((a, b) => a[0] - b[0]);
  let rankSum = 0, pos = 0;
  pairs.forEach(([, y], i) => { if (y === 1) { rankSum += i + 1; pos++; } });
  const neg = pairs.length - pos;
  return pos && neg ? (rankSum - (pos * (pos + 1)) / 2) / (pos * neg) : 0.5;
}

export function trainModel(students: Student[], epochs = 400, lr = 0.3, l2 = 0.001): Model | null {
  const labelled = students.filter((s) => s.atRiskLabel === 0 || s.atRiskLabel === 1);
  if (labelled.length < 50) return null;
  const feats = ML_FEATURES.map((f) => f.key).filter((k) => labelled.filter((s) => s[k] != null).length >= labelled.length * 0.5);
  if (!feats.length) return null;
  const means = feats.map((k) => { const v = labelled.map((s) => s[k]).filter((x): x is number => x != null); return v.reduce((a, b) => a + b, 0) / v.length; });
  const stds = feats.map((k, i) => { const v = labelled.map((s) => s[k]).filter((x): x is number => x != null); const sd = Math.sqrt(v.reduce((a, b) => a + (b - means[i]!) ** 2, 0) / v.length); return sd || 1; });
  const train = labelled.filter((_, i) => i % 5 !== 0);
  const test = labelled.filter((_, i) => i % 5 === 0);
  if (new Set(train.map((s) => s.atRiskLabel)).size < 2) return null;
  const X = train.map((s) => vector(s, feats, means, stds));
  const Y = train.map((s) => s.atRiskLabel as number);
  const w = feats.map(() => 0);
  let b = 0;
  for (let e = 0; e < epochs; e++) {
    const gw = w.map(() => 0);
    let gb = 0;
    for (let n = 0; n < X.length; n++) {
      const err = sigmoid(X[n]!.reduce((a, v, i) => a + v * w[i]!, b)) - Y[n]!;
      for (let i = 0; i < w.length; i++) gw[i]! += err * X[n]![i]!;
      gb += err;
    }
    for (let i = 0; i < w.length; i++) w[i] = w[i]! - lr * (gw[i]! / X.length + l2 * w[i]!);
    b -= lr * (gb / X.length);
  }
  const m: Model = { features: feats, means, stds, weights: w, bias: b, threshold: 0.5, trainSize: train.length, testSize: test.length, metrics: { accuracy: 0, precision: 0, recall: 0, f1: 0, auc: 0 }, confusion: { tp: 0, fp: 0, tn: 0, fn: 0 } };
  const scores = test.map((s) => predict(m, s));
  const labels = test.map((s) => s.atRiskLabel as number);
  const c = { tp: 0, fp: 0, tn: 0, fn: 0 };
  scores.forEach((p, i) => { const y = labels[i]; const yh = p >= m.threshold ? 1 : 0; if (yh && y) c.tp++; else if (yh) c.fp++; else if (y) c.fn++; else c.tn++; });
  const precision = c.tp / (c.tp + c.fp || 1);
  const recall = c.tp / (c.tp + c.fn || 1);
  m.confusion = c;
  m.metrics = { accuracy: (c.tp + c.tn) / (test.length || 1), precision, recall, f1: (2 * precision * recall) / (precision + recall || 1), auc: auc(scores, labels) };
  return m;
}

export const featureLabel = (k: string) => ML_FEATURES.find((f) => f.key === k)?.label ?? k;
export type MlRisk = Num;
