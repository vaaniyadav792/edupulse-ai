import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, Empty, FilterBar, PageHeader, RiskBadge } from "@/components/app/ui-bits";
import { InterventionDialog } from "@/components/app/InterventionDialog";
import { useStore } from "@/lib/store";
import { INTERVENTION_STATUSES, type Intervention, type InterventionStatus } from "@/lib/types";

export const Route = createFileRoute("/interventions")({
  head: () => ({
    meta: [
      { title: "Risk & Interventions — EduPulse AI" },
      { name: "description", content: "Explainable risk flags and a tracker for faculty support actions." },
      { property: "og:title", content: "Risk & Interventions — EduPulse AI" },
      { property: "og:description", content: "Explainable risk flags and a tracker for faculty support actions." },
    ],
  }),
  component: Interventions,
});

function Interventions() {
  const { filtered, interventions, views, saveIntervention, deleteIntervention } = useStore();
  const [dlg, setDlg] = useState<Partial<Intervention> | null>(null);
  const [status, setStatus] = useState<string>("all");
  const flagged = useMemo(() => filtered.filter((s) => s.flags.length > 0).sort((a, b) => b.flags.length - a.flags.length), [filtered]);
  const list = interventions.filter((i) => status === "all" || i.status === status);
  const nameOf = (id: string) => views.find((v) => v.id === id)?.name ?? "Unknown (not in dataset)";

  return (
    <>
      <PageHeader title="Risk & Interventions" subtitle="Risk flags are transparent threshold rules — this app does not use a trained ML model."
        actions={<Button onClick={() => setDlg({})}><Plus className="h-4 w-4" /> New intervention</Button>} />
      <Tabs defaultValue="flags">
        <TabsList><TabsTrigger value="flags">Flagged students ({flagged.length})</TabsTrigger><TabsTrigger value="tracker">Intervention tracker ({interventions.length})</TabsTrigger></TabsList>
        <TabsContent value="flags" className="mt-4">
          <FilterBar />
          {flagged.length === 0 ? <Card><Empty title="No flagged students" hint="Nobody in this view triggers a risk rule." /></Card> : (
            <div className="grid gap-4 md:grid-cols-2">
              {flagged.map((s) => (
                <Card key={s.id}>
                  <div className="mb-3 flex items-start justify-between">
                    <div><Link to="/students/$id" params={{ id: s.id }} className="font-semibold text-primary hover:underline">{s.id} · {s.name}</Link><p className="text-xs text-muted-foreground">{s.department} · Year {s.year}</p></div>
                    <RiskBadge r={s.academicRisk} />
                  </div>
                  <ul className="space-y-2">
                    {s.flags.map((f) => (
                      <li key={f.key} className="rounded-lg bg-muted/60 p-2.5 text-xs">
                        <p className="flex items-center gap-1.5 font-semibold"><ShieldAlert className="h-3.5 w-3.5 text-priority" />{f.label} <span className="text-muted-foreground">— {f.indicator}</span></p>
                        <p className="mt-1 flex items-center justify-between gap-2"><span>{f.action}</span>
                          <button className="shrink-0 font-medium text-primary hover:underline" onClick={() => setDlg({ studentId: s.id, type: f.interventionType, notes: f.action })}>Assign</button></p>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="tracker" className="mt-4">
          <Card action={
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem>{INTERVENTION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          } title="Support actions">
            {list.length === 0 ? <Empty title="No interventions" hint="Create one from a flagged student or the button above." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="py-2">Student</th><th>Type</th><th>Mentor</th><th>Due</th><th>Notes</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {list.map((i) => (
                      <tr key={i.id} className="border-b align-top last:border-0">
                        <td className="py-2.5"><Link to="/students/$id" params={{ id: i.studentId }} className="font-semibold text-primary hover:underline">{i.studentId}</Link><p className="text-xs text-muted-foreground">{nameOf(i.studentId)}</p></td>
                        <td className="py-2.5">{i.type}</td><td className="py-2.5">{i.mentor}</td><td className="py-2.5 whitespace-nowrap">{i.dueDate}</td>
                        <td className="max-w-56 py-2.5 text-xs text-muted-foreground">{i.notes || "—"}</td>
                        <td className="py-2">
                          <Select value={i.status} onValueChange={(v) => { saveIntervention({ ...i, status: v as InterventionStatus }); toast.success(`Status set to ${v}`); }}>
                            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>{INTERVENTION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 whitespace-nowrap">
                          <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setDlg(i)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => { deleteIntervention(i.id); toast("Intervention deleted"); }}><Trash2 className="h-4 w-4" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
      <InterventionDialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)} {...(dlg ? { initial: dlg } : {})} />
    </>
  );
}
