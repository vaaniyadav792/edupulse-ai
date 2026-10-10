import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CategoryBadge, Empty, FilterBar, PageHeader, fmt } from "@/components/app/ui-bits";
import { useStore } from "@/lib/store";
import { SEGMENTS } from "@/lib/segments";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/segments")({
  head: () => ({
    meta: [
      { title: "Student Segmentation — EduPulse AI" },
      { name: "description", content: "Rule-based student segments to target support where it matters." },
      { property: "og:title", content: "Student Segmentation — EduPulse AI" },
      { property: "og:description", content: "Rule-based student segments to target support where it matters." },
    ],
  }),
  component: Segments,
});

function Segments() {
  const { filtered } = useStore();
  const [open, setOpen] = useState(SEGMENTS[0]!.id);
  const seg = SEGMENTS.find((s) => s.id === open) ?? SEGMENTS[0]!;
  const members = filtered.filter(seg.test);

  return (
    <>
      <PageHeader title="Student Segmentation" subtitle="Transparent rule-based segments. A student can belong to more than one." />
      <FilterBar />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SEGMENTS.map((s) => {
          const n = filtered.filter(s.test).length;
          return (
            <button key={s.id} onClick={() => setOpen(s.id)} className={cn("card-surface p-5 text-left transition hover:-translate-y-0.5", open === s.id && "ring-2 ring-primary")}>
              <p className="font-display text-3xl font-bold text-brand">{n}</p>
              <p className="mt-1 font-semibold">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.description}</p>
              <p className="mt-2 inline-block rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{s.rule}</p>
            </button>
          );
        })}
      </div>
      <Card title={seg.name} subtitle={`${members.length} students · ${seg.rule}`} className="mt-6">
        {members.length === 0 ? <Empty title="No students in this segment" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="py-2">Student</th><th>Dept</th><th>CGPA</th><th>Attendance</th><th>LMS</th><th>Readiness</th><th>Score</th></tr></thead>
              <tbody>
                {members.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-accent/50">
                    <td className="py-2"><Link to="/students/$id" params={{ id: s.id }} className="font-semibold text-primary hover:underline">{s.id}</Link> <span className="text-xs text-muted-foreground">{s.name}</span></td>
                    <td>{s.department}</td><td>{fmt(s.cgpa, 2)}</td><td>{fmt(s.attendance)}%</td><td>{fmt(s.lmsLogins)}</td><td>{fmt(s.readiness)}</td>
                    <td><span className="mr-2 font-semibold">{fmt(s.success, 1)}</span><CategoryBadge c={s.category} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
