import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FlaskConical, RotateCcw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CategoryBadge, Empty, PageHeader, fmt, tooltipStyle } from "@/components/app/ui-bits";
import { useStore } from "@/lib/store";
import { COMPONENT_LABELS, evaluate, WEIGHTS, type ComponentKey } from "@/lib/scoring";
import type { Student } from "@/lib/types";

export const Route = createFileRoute("/simulator")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => (typeof s.id === "string" ? { id: s.id } : {}),
  head: () => ({
    meta: [
      { title: "What-If Simulator — EduPulse AI" },
      { name: "description", content: "Test hypothetical improvements and see the Success Score and Placement Readiness change." },
      { property: "og:title", content: "What-If Simulator — EduPulse AI" },
      { property: "og:description", content: "Test hypothetical improvements and see the Success Score and Placement Readiness change." },
    ],
  }),
  component: Simulator,
});

type SimKey = "attendance" | "assignmentCompletion" | "lmsLogins" | "aptitude" | "coding" | "mockInterview";
const SLIDERS: { key: SimKey; label: string; max: number; unit: string }[] = [
  { key: "attendance", label: "Attendance", max: 100, unit: "%" },
  { key: "assignmentCompletion", label: "Assignment completion", max: 100, unit: "%" },
  { key: "lmsLogins", label: "LMS logins / month", max: 60, unit: "" },
  { key: "aptitude", label: "Aptitude score", max: 100, unit: "" },
  { key: "coding", label: "Coding score", max: 100, unit: "" },
  { key: "mockInterview", label: "Mock interview score", max: 100, unit: "" },
];

function Simulator() {
  const { views, students } = useStore();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const id = search.id && views.some((v) => v.id === search.id) ? search.id : views[0]?.id;
  const original = students.find((s) => s.id === id);
  const [over, setOver] = useState<Partial<Record<SimKey, number>>>({});

  const before = useMemo(() => (original ? evaluate(original) : null), [original]);
  const after = useMemo(() => (original ? evaluate({ ...original, ...over } as Student) : null), [original, over]);

  if (!original || !before || !after) return <><PageHeader title="What-If Simulator" /><Card><Empty title="No students available" hint="Import data first." /></Card></>;

  const keys = Object.keys(WEIGHTS) as ComponentKey[];
  const chart = keys.map((k) => ({ k: COMPONENT_LABELS[k].split(" ")[0], Before: +(before.components[k] ?? 0).toFixed(1), After: +(after.components[k] ?? 0).toFixed(1) }));
  const delta = (a: number | null, b: number | null) => (a === null || b === null ? "" : `${b - a >= 0 ? "+" : ""}${(b - a).toFixed(1)}`);

  return (
    <>
      <PageHeader title="What-If Simulator" subtitle="Hypothetical scenarios only — the original student record is never changed."
        actions={<Button variant="outline" onClick={() => setOver({})}><RotateCcw className="h-4 w-4" /> Reset scenario</Button>} />
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-cyan/40 bg-cyan/10 px-4 py-2.5 text-sm"><FlaskConical className="h-4 w-4 text-cyan" /> <b>Hypothetical scenario.</b> Uses the exact same scoring formulas as the dashboard.</div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Adjust indicators" className="lg:col-span-2">
          <Select value={id} onValueChange={(v) => { setOver({}); navigate({ to: ".", search: { id: v } }); }}>
            <SelectTrigger className="mb-5"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">{views.map((s) => <SelectItem key={s.id} value={s.id}>{s.id} · {s.name} ({s.department})</SelectItem>)}</SelectContent>
          </Select>
          <div className="space-y-5">
            {SLIDERS.map((sl) => {
              const orig = original[sl.key];
              const val = over[sl.key] ?? orig ?? 0;
              return (
                <div key={sl.key}>
                  <div className="mb-2 flex justify-between text-sm"><span>{sl.label}</span><span><span className="text-muted-foreground">{orig === null ? "missing" : `${orig}${sl.unit}`} → </span><b>{val}{sl.unit}</b></span></div>
                  <Slider value={[val]} max={sl.max} step={1} onValueChange={([v]) => setOver((p) => ({ ...p, [sl.key]: v }))} aria-label={sl.label} />
                </div>
              );
            })}
          </div>
        </Card>
        <div className="space-y-6 lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-2">
            {[{ label: "Success Score", a: before.success, b: after.success }, { label: "Placement Readiness", a: before.readiness, b: after.readiness }].map((m) => (
              <div key={m.label} className="card-surface p-5">
                <p className="text-xs font-medium uppercase text-muted-foreground">{m.label}</p>
                <div className="mt-2 flex items-end gap-3">
                  <span className="text-2xl text-muted-foreground line-through decoration-1">{fmt(m.a, 1)}</span>
                  <span className="font-display text-4xl font-bold">{fmt(m.b, 1)}</span>
                  <span className="mb-1 text-sm font-semibold text-ontrack">{delta(m.a, m.b)}</span>
                </div>
              </div>
            ))}
          </div>
          <Card title="Category & risk">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <CategoryBadge c={before.category} /> → <CategoryBadge c={after.category} />
              <span className="ml-auto text-muted-foreground">Risk flags: {before.flags.length} → <b className="text-foreground">{after.flags.length}</b></span>
            </div>
            {after.flags.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Remaining: {after.flags.map((f) => f.label).join(", ")}</p>}
          </Card>
          <Card title="Component comparison">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="k" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Before" fill="var(--muted-foreground)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="After" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </>
  );
}
