import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { StudentPicker } from "./StudentPicker";
import { INTERVENTION_STATUSES, INTERVENTION_TYPES, type Intervention } from "@/lib/types";

export function InterventionDialog({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: Partial<Intervention> }) {
  const { views, saveIntervention } = useStore();
  const blank = (): Intervention => ({ id: `INT-${Date.now()}`, studentId: views[0]?.id ?? "", type: "Academic Mentoring", mentor: "", dueDate: "", notes: "", status: "Planned", createdAt: new Date().toISOString() });
  const [f, setF] = useState<Intervention>(blank);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setF({ ...blank(), ...initial }); setErr(null); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    if (!f.studentId || !views.some((s) => s.id === f.studentId)) return setErr("Choose a valid student.");
    if (!f.mentor.trim()) return setErr("Assign a mentor.");
    if (!f.dueDate) return setErr("Set a due date.");
    saveIntervention({ ...f, mentor: f.mentor.trim() });
    toast.success(initial?.mentor ? "Intervention updated" : "Intervention created");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{initial?.mentor ? "Edit intervention" : "New support action"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Student</Label>
            <StudentPicker value={f.studentId} onChange={(v) => setF((p) => ({ ...p, studentId: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as Intervention["type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INTERVENTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as Intervention["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INTERVENTION_STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label htmlFor="mentor">Mentor</Label><Input id="mentor" value={f.mentor} onChange={(e) => setF({ ...f, mentor: e.target.value })} placeholder="e.g. Dr. K. Varma" /></div>
            <div className="grid gap-1.5"><Label htmlFor="due">Due date</Label><Input id="due" type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></div>
          </div>
          <div className="grid gap-1.5"><Label htmlFor="notes">Notes</Label><Textarea id="notes" rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
