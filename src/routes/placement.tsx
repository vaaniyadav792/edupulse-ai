import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, Empty, FilterBar, Kpi, PageHeader, fmt, tooltipStyle } from "@/components/app/ui-bits";
import { useStore } from "@/lib/store";
import { mean } from "@/lib/scoring";
import { Briefcase, Code2, Mic, Target } from "lucide-react";

export const Route = createFileRoute("/placement")({
  head: () => ({
    meta: [
      { title: "Placement Readiness — EduPulse AI" },
      { name: "description", content: "Aptitude, coding, mock interview and soft-skill readiness across departments." },
      { property: "og:title", content: "Placement Readiness — EduPulse AI" },
      { property: "og:description", content: "Aptitude, coding, mock interview and soft-skill readiness across departments." },
    ],
  }),
  component: Placement,
});

function Placement() {
  const { filtered } = useStore();
  const d = useMemo(() => {
    const avg = (k: "aptitude" | "coding" | "mockInterview" | "softSkills" | "placementTraining") => +(mean(filtered.map((s) => s[k])) ?? 0).toFixed(1);
    const depts = [...new Set(filtered.map((s) => s.department))].sort();
    return {
      radar: [{ k: "Aptitude", v: avg("aptitude") }, { k: "Coding", v: avg("coding") }, { k: "Mock interview", v: avg("mockInterview") }, { k: "Soft skills", v: avg("softSkills") }, { k: "Training", v: avg("placementTraining") }],
      dept: depts.map((dep) => ({ dept: dep, readiness: +(mean(filtered.filter((s) => s.department === dep).map((s) => s.readiness)) ?? 0).toFixed(1) })),
      ready: [...filtered].filter((s) => s.readiness !== null).sort((a, b) => (b.readiness ?? 0) - (a.readiness ?? 0)),
      avgs: { apt: avg("aptitude"), cod: avg("coding"), mock: avg("mockInterview") },
    };
  }, [filtered]);

  const gap = d.ready.filter((s) => (s.cgpa ?? 0) >= 8 && (s.readiness ?? 100) < 55);

  return (
    <>
      <PageHeader title="Placement Readiness" subtitle="Calculated separately from aptitude, coding, mock interview, soft skills and training (25/25/25/15/10, renormalized when missing)." />
      <FilterBar />
      {filtered.length === 0 ? <Card><Empty /></Card> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Avg readiness" value={fmt(mean(filtered.map((s) => s.readiness)), 1)} icon={<Target className="h-5 w-5" />} />
            <Kpi label="Avg aptitude" value={fmt(d.avgs.apt, 1)} tone="cyan" icon={<Briefcase className="h-5 w-5" />} />
            <Kpi label="Avg coding" value={fmt(d.avgs.cod, 1)} tone="ontrack" icon={<Code2 className="h-5 w-5" />} />
            <Kpi label="Avg mock interview" value={fmt(d.avgs.mock, 1)} tone="attention" icon={<Mic className="h-5 w-5" />} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card title="Readiness by department">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d.dept}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="dept" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="readiness" name="Readiness" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Skill profile (average)">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={d.radar}><PolarGrid stroke="var(--border)" /><PolarAngleAxis dataKey="k" tick={{ fontSize: 11 }} /><Radar dataKey="v" stroke="var(--primary)" fill="var(--cyan)" fillOpacity={0.35} /><Tooltip contentStyle={tooltipStyle} /></RadarChart>
              </ResponsiveContainer>
            </Card>
            <StudentList title="Most placement-ready" rows={d.ready.slice(0, 8)} />
            <StudentList title="Strong academics, low readiness" subtitle="CGPA ≥ 8 but readiness < 55 — quick wins for placement prep" rows={gap.slice(0, 8)} />
          </div>
        </>
      )}
    </>
  );
}

function StudentList({ title, subtitle, rows }: { title: string; subtitle?: string | undefined; rows: { id: string; name: string; department: string; cgpa: number | null; readiness: number | null }[] }) {
  return (
    <Card title={title} {...(subtitle ? { subtitle } : {})}>
      {rows.length === 0 ? <Empty title="None in this view" hint="" /> : (
        <ul className="divide-y">
          {rows.map((s) => (
            <li key={s.id}><Link to="/students/$id" params={{ id: s.id }} className="flex items-center justify-between py-2 text-sm hover:text-primary">
              <span><b>{s.id}</b> <span className="text-muted-foreground">· {s.name} · {s.department}</span></span>
              <span className="text-xs">CGPA {fmt(s.cgpa, 2)} · <b>PR {fmt(s.readiness)}</b></span>
            </Link></li>
          ))}
        </ul>
      )}
    </Card>
  );
}
