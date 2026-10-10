import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlertTriangle, Briefcase, CalendarCheck, Gauge, Target, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { Card, CATEGORY_COLOR, Empty, FilterBar, Kpi, PageHeader, fmt, tooltipStyle } from "@/components/app/ui-bits";
import { useStore } from "@/lib/store";
import { mean } from "@/lib/scoring";
import type { Category } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — EduPulse AI" },
      { name: "description", content: "Campus-wide student success KPIs, risk factors and department performance." },
      { property: "og:title", content: "Overview — EduPulse AI" },
      { property: "og:description", content: "Campus-wide student success KPIs, risk factors and department performance." },
    ],
  }),
  component: Overview,
});

const CATS: Category[] = ["On Track", "Monitor", "Needs Attention", "High Priority"];

function Overview() {
  const { filtered } = useStore();
  const d = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({ range: `${i * 10}-${i * 10 + 9}`, count: 0, mid: i * 10 + 5 }));
    filtered.forEach((s) => { if (s.success !== null) buckets[Math.min(9, Math.floor(s.success / 10))]!.count++; });
    const depts = [...new Set(filtered.map((s) => s.department))].sort().map((dep) => {
      const g = filtered.filter((s) => s.department === dep);
      return { dept: dep, success: +(mean(g.map((s) => s.success)) ?? 0).toFixed(1), readiness: +(mean(g.map((s) => s.readiness)) ?? 0).toFixed(1) };
    });
    const factors = new Map<string, number>();
    filtered.forEach((s) => s.flags.forEach((f) => factors.set(f.label, (factors.get(f.label) ?? 0) + 1)));
    const readinessBands = [
      { band: "< 40", count: filtered.filter((s) => s.readiness !== null && s.readiness < 40).length },
      { band: "40–54", count: filtered.filter((s) => s.readiness !== null && s.readiness >= 40 && s.readiness < 55).length },
      { band: "55–69", count: filtered.filter((s) => s.readiness !== null && s.readiness >= 55 && s.readiness < 70).length },
      { band: "70–84", count: filtered.filter((s) => s.readiness !== null && s.readiness >= 70 && s.readiness < 85).length },
      { band: "85+", count: filtered.filter((s) => s.readiness !== null && s.readiness >= 85).length },
    ];
    return {
      buckets,
      depts,
      factors: [...factors.entries()].map(([factor, count]) => ({ factor, count })).sort((a, b) => b.count - a.count),
      readinessBands,
      cats: CATS.map((c) => ({ name: c, count: filtered.filter((s) => s.category === c).length })),
      scatter: CATS.map((c) => ({ c, pts: filtered.filter((s) => s.category === c && s.attendance !== null && s.cgpa !== null).map((s) => ({ x: s.attendance, y: s.cgpa, id: s.id })) })),
    };
  }, [filtered]);

  const atRisk = filtered.filter((s) => s.academicRisk !== "Low").length;
  const lowPR = filtered.filter((s) => s.lowPlacement).length;

  return (
    <>
      <PageHeader title="Overview Dashboard" subtitle="All figures are computed live from the current student dataset." />
      <FilterBar />
      {filtered.length === 0 ? <Card><Empty /></Card> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Kpi label="Total students" value={String(filtered.length)} icon={<Users className="h-5 w-5" />} />
            <Kpi label="Academic risk" value={String(atRisk)} hint="2+ academic rule flags" tone="priority" icon={<AlertTriangle className="h-5 w-5" />} />
            <Kpi label="Low placement readiness" value={String(lowPR)} hint="Readiness below 50" tone="attention" icon={<Briefcase className="h-5 w-5" />} />
            <Kpi label="Avg Success Score" value={fmt(mean(filtered.map((s) => s.success)), 1)} hint="0–100 weighted score" tone="cyan" icon={<Gauge className="h-5 w-5" />} />
            <Kpi label="Avg attendance" value={`${fmt(mean(filtered.map((s) => s.attendance)), 1)}%`} tone="ontrack" icon={<CalendarCheck className="h-5 w-5" />} />
            <Kpi label="Avg placement readiness" value={fmt(mean(filtered.map((s) => s.readiness)), 1)} tone="primary" icon={<Target className="h-5 w-5" />} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card title="Success Score distribution" subtitle="Students per 10-point band" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d.buckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]}>
                    {d.buckets.map((b) => <Cell key={b.range} fill={b.mid >= 80 ? CATEGORY_COLOR["On Track"] : b.mid >= 60 ? CATEGORY_COLOR.Monitor : b.mid >= 40 ? CATEGORY_COLOR["Needs Attention"] : CATEGORY_COLOR["High Priority"]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="By category">
              <div className="space-y-3">
                {d.cats.map((c) => (
                  <div key={c.name}>
                    <div className="mb-1 flex justify-between text-sm"><span>{c.name}</span><b>{c.count}</b></div>
                    <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full" style={{ width: `${(c.count / filtered.length) * 100}%`, background: CATEGORY_COLOR[c.name] }} /></div>
                  </div>
                ))}
              </div>
              <Link to="/segments" className="mt-5 inline-block text-sm font-medium text-primary hover:underline">Explore segments →</Link>
            </Card>

            <Card title="Department performance" subtitle="Average Success Score vs Placement Readiness" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d.depts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="dept" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="success" name="Success Score" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="readiness" name="Placement Readiness" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Placement readiness bands">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d.readinessBands} layout="vertical">
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis dataKey="band" type="category" width={48} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Students" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Attendance vs academic performance" subtitle="Each dot is a student, coloured by category" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" dataKey="x" name="Attendance %" domain={[40, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="number" dataKey="y" name="CGPA" domain={[4, 10]} tick={{ fontSize: 11 }} />
                  <ZAxis range={[40, 40]} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {d.scatter.map((g) => <Scatter key={g.c} name={g.c} data={g.pts} fill={CATEGORY_COLOR[g.c]} />)}
                </ScatterChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Top risk factors" subtitle="Rule-based flags (not ML)">
              {d.factors.length === 0 ? <Empty title="No risk flags" hint="Every student is within thresholds." /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={d.factors} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis dataKey="factor" type="category" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Students" fill="var(--chart-5)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
