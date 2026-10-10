import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, Empty, FilterBar, PageHeader, tooltipStyle } from "@/components/app/ui-bits";
import { useStore } from "@/lib/store";
import { mean } from "@/lib/scoring";

export const Route = createFileRoute("/academics")({
  head: () => ({
    meta: [
      { title: "Academic Analytics — EduPulse AI" },
      { name: "description", content: "CGPA, attendance, backlogs and engagement trends by department and year." },
      { property: "og:title", content: "Academic Analytics — EduPulse AI" },
      { property: "og:description", content: "CGPA, attendance, backlogs and engagement trends by department and year." },
    ],
  }),
  component: Academics,
});

const r1 = (v: number | null) => (v === null ? 0 : +v.toFixed(2));

function Academics() {
  const { filtered } = useStore();
  const d = useMemo(() => {
    const depts = [...new Set(filtered.map((s) => s.department))].sort();
    const years = [...new Set(filtered.map((s) => s.year))].sort();
    const cg = [4, 5, 6, 7, 8, 9].map((lo) => ({ band: `${lo}–${lo + 1}`, count: filtered.filter((s) => s.cgpa !== null && s.cgpa >= lo && (lo === 9 ? s.cgpa <= 10 : s.cgpa < lo + 1)).length }));
    return {
      dept: depts.map((dep) => { const g = filtered.filter((s) => s.department === dep); return { dept: dep, cgpa: r1(mean(g.map((s) => s.cgpa))), attendance: r1(mean(g.map((s) => s.attendance))), assignments: r1(mean(g.map((s) => s.assignmentCompletion))) }; }),
      year: years.map((y) => { const g = filtered.filter((s) => s.year === y); return { year: `Year ${y}`, cgpa: r1(mean(g.map((s) => s.cgpa))), prev: r1(mean(g.map((s) => s.prevCgpa))), lms: r1(mean(g.map((s) => s.lmsLogins))) }; }),
      cg,
      backlogs: [0, 1, 2, 3].map((n) => ({ n: n === 3 ? "3+" : String(n), count: filtered.filter((s) => (n === 3 ? (s.backlogs ?? 0) >= 3 : s.backlogs === n)).length })),
      declining: filtered.filter((s) => s.flags.some((f) => f.key === "decline")).length,
    };
  }, [filtered]);

  return (
    <>
      <PageHeader title="Academic Analytics" subtitle="Academic indicators derived from the same student dataset." />
      <FilterBar />
      {filtered.length === 0 ? <Card><Empty /></Card> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Department averages" subtitle="CGPA (×10 scale shown on left axis as raw)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={d.dept}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="dept" tick={{ fontSize: 11 }} /><YAxis yAxisId="l" domain={[0, 10]} tick={{ fontSize: 11 }} /><YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="cgpa" name="Avg CGPA" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="r" dataKey="attendance" name="Avg attendance %" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="r" dataKey="assignments" name="Assignment %" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="CGPA distribution">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={d.cg}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="band" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Students" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Year-wise CGPA trend" subtitle="Current vs previous-term CGPA">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={d.year}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} /><YAxis domain={[5, 9]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="prev" name="Previous CGPA" stroke="var(--chart-2)" strokeWidth={2} />
                <Line dataKey="cgpa" name="Current CGPA" stroke="var(--chart-1)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground">{d.declining} students show a CGPA decline of 0.5 or more.</p>
          </Card>
          <Card title="Backlogs">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d.backlogs}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="n" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Students" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </>
  );
}
