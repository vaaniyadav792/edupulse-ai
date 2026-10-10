import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, FlaskConical, Plus, ShieldAlert } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CategoryBadge, Empty, Meter, PageHeader, RiskBadge, fmt, tooltipStyle } from "@/components/app/ui-bits";
import { InterventionDialog } from "@/components/app/InterventionDialog";
import { useStore } from "@/lib/store";
import { COMPONENT_LABELS, READINESS_WEIGHTS, WEIGHTS, type ComponentKey } from "@/lib/scoring";
import type { Intervention } from "@/lib/types";

export const Route = createFileRoute("/students/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Student ${params.id} — EduPulse AI` },
      { name: "description", content: "Student profile with Success Score breakdown, risk explanations and interventions." },
      { property: "og:title", content: `Student ${params.id} — EduPulse AI` },
      { property: "og:description", content: "Student profile with Success Score breakdown, risk explanations and interventions." },
    ],
  }),
  component: Profile,
});

const RLABEL: Record<keyof typeof READINESS_WEIGHTS, string> = { aptitude: "Aptitude", coding: "Coding", mockInterview: "Mock interview", softSkills: "Soft skills", placementTraining: "Placement training" };

function Profile() {
  const { id } = Route.useParams();
  const { views, interventions } = useStore();
  const s = views.find((v) => v.id === id);
  const [dlg, setDlg] = useState<Partial<Intervention> | null>(null);

  if (!s) return <Card><Empty title="Student not found" hint={`No record with ID ${id} in the current dataset.`} /><div className="text-center"><Link to="/students" className="text-sm text-primary">Back to students</Link></div></Card>;

  const keys = Object.keys(WEIGHTS) as ComponentKey[];
  const radar = keys.map((k) => ({ k: COMPONENT_LABELS[k].split(" ")[0], v: s.components[k] ?? 0 }));
  const mine = interventions.filter((i) => i.studentId === s.id);

  return (
    <>
      <Link to="/students" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All students</Link>
      <PageHeader title={`${s.name}`} subtitle={`${s.id} · ${s.department} · Year ${s.year} · ${s.source === "synthetic" ? "Synthetic demo record" : "Imported record"}`}
        actions={<>
          <Button variant="outline" asChild><Link to="/simulator" search={{ id: s.id }}><FlaskConical className="h-4 w-4" /> What-if</Link></Button>
          <Button onClick={() => setDlg({ studentId: s.id, type: s.flags[0]?.interventionType ?? "Academic Mentoring" })}><Plus className="h-4 w-4" /> Add intervention</Button>
        </>} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-brand text-primary-foreground">
          <p className="text-sm opacity-80">Student Success Score</p>
          <p className="font-display text-5xl font-bold">{fmt(s.success, 1)}</p>
          <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-card px-2.5 py-0.5"><CategoryBadge c={s.category} /></span></div>
          <p className="mt-4 text-sm opacity-90">Data completeness: {(s.completeness * 100).toFixed(0)}% of score weight available{ s.completeness < 1 && " — missing components were renormalized out"}.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><p className="opacity-75">Placement readiness</p><p className="text-xl font-bold">{fmt(s.readiness, 0)}</p></div>
            <div><p className="opacity-75">Academic risk</p><p className="mt-1"><span className="rounded-full bg-card px-1 py-0.5"><RiskBadge r={s.academicRisk} /></span></p></div>
          </div>
        </Card>

        <Card title="Score breakdown" subtitle="Normalized 0–100 per component × weight">
          <div className="space-y-3">
            {keys.map((k) => (
              <div key={k}>
                <div className="mb-1 flex justify-between text-sm"><span>{COMPONENT_LABELS[k]} <span className="text-muted-foreground">({WEIGHTS[k] * 100}%)</span></span><b>{s.components[k] === null ? <span className="text-muted-foreground">missing</span> : fmt(s.components[k], 0)}</b></div>
                <Meter value={s.components[k]} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Profile shape">
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radar}>
              <PolarGrid stroke="var(--border)" /><PolarAngleAxis dataKey="k" tick={{ fontSize: 11 }} />
              <Radar dataKey="v" stroke="var(--primary)" fill="var(--cyan)" fillOpacity={0.35} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Indicators" className="lg:col-span-1">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {[["CGPA", fmt(s.cgpa, 2)], ["Previous CGPA", fmt(s.prevCgpa, 2)], ["Backlogs", fmt(s.backlogs)], ["Attendance", s.attendance === null ? "—" : `${s.attendance}%`], ["Assignments", s.assignmentCompletion === null ? "—" : `${s.assignmentCompletion}%`], ["LMS logins/mo", fmt(s.lmsLogins)], ["Engagement", fmt(s.engagement)], ["Certifications", fmt(s.certifications)]].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>
            ))}
          </dl>
        </Card>

        <Card title="Placement readiness inputs" subtitle={`Completeness ${(s.readinessCompleteness * 100).toFixed(0)}%`}>
          <div className="space-y-3">
            {(Object.keys(RLABEL) as (keyof typeof RLABEL)[]).map((k) => (
              <div key={k}><div className="mb-1 flex justify-between text-sm"><span>{RLABEL[k]}</span><b>{s[k] === null ? <span className="text-muted-foreground">missing</span> : s[k]}</b></div><Meter value={s[k]} color="var(--cyan)" /></div>
            ))}
          </div>
        </Card>

        <Card title="Risk explanation" subtitle="Transparent rule-based flags — not an ML prediction">
          {s.flags.length === 0 ? <p className="text-sm text-muted-foreground">No rules triggered. Student is within all thresholds.</p> : (
            <ul className="space-y-3">
              {s.flags.map((f) => (
                <li key={f.key} className="rounded-lg border p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="h-4 w-4 text-priority" />{f.label}<span className="ml-auto rounded bg-muted px-1.5 text-[10px] uppercase text-muted-foreground">{f.kind}</span></p>
                  <p className="mt-1 text-xs text-muted-foreground">{f.indicator}</p>
                  <p className="mt-1 text-xs"><b>Recommended:</b> {f.action}</p>
                  <button className="mt-1 text-xs font-medium text-primary hover:underline" onClick={() => setDlg({ studentId: s.id, type: f.interventionType, notes: f.action })}>Create this intervention →</button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Interventions" className="lg:col-span-3">
          {mine.length === 0 ? <p className="text-sm text-muted-foreground">No support actions yet.</p> : (
            <div className="grid gap-3 md:grid-cols-2">
              {mine.map((i) => (
                <button key={i.id} onClick={() => setDlg(i)} className="rounded-lg border p-3 text-left hover:bg-accent/50">
                  <p className="flex justify-between text-sm font-semibold">{i.type}<span className="text-xs text-primary">{i.status}</span></p>
                  <p className="text-xs text-muted-foreground">{i.mentor} · due {i.dueDate}</p>
                  {i.notes && <p className="mt-1 text-xs">{i.notes}</p>}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
      <InterventionDialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)} initial={dlg ?? undefined} />
    </>
  );
}
