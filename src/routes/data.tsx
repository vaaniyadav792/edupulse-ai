import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileUp, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, PageHeader } from "@/components/app/ui-bits";
import { useStore } from "@/lib/store";
import { autoMap, download, FIELDS, parseCSV, templateCSV, toCSV, validateRow } from "@/lib/csv";
import type { Student } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "CSV Import & Reports — EduPulse AI" },
      { name: "description", content: "Import student CSVs with column mapping and validation, and export analytics reports." },
      { property: "og:title", content: "CSV Import & Reports — EduPulse AI" },
      { property: "og:description", content: "Import student CSVs with column mapping and validation, and export analytics reports." },
    ],
  }),
  component: DataPage,
});

interface Parsed { name: string; headers: string[]; rows: string[][] }

function DataPage() {
  const { views, filtered, students, importStudents, resetDemo, hasImported } = useStore();
  const [file, setFile] = useState<Parsed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<"replace" | "append">("replace");

  const onFile = async (f: File | undefined) => {
    setError(null); setFile(null);
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) return setError("Please upload a .csv file.");
    if (f.size > 5 * 1024 * 1024) return setError("File is larger than 5 MB.");
    setLoading(true);
    try {
      const rows = parseCSV(await f.text());
      if (rows.length < 2) throw new Error("The file needs a header row and at least one data row.");
      if (rows.length > 5001) throw new Error("Maximum 5,000 rows per import.");
      const headers = rows[0]!.map((h) => h.trim());
      setFile({ name: f.name, headers, rows: rows.slice(1) });
      setMapping(autoMap(headers));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read file.");
    } finally { setLoading(false); }
  };

  const missingRequired = FIELDS.filter((f) => f.required && (mapping[f.key] ?? -1) < 0);
  const results = file && missingRequired.length === 0 ? file.rows.map((r) => validateRow(r, mapping)) : [];
  // duplicate detection
  const seen = new Set(mode === "append" ? students.map((s) => s.id) : []);
  results.forEach((r) => {
    if (!r.student) return;
    if (seen.has(r.student.id)) { r.errors.push(`Duplicate student ID ${r.student.id}`); r.student = null; } else seen.add(r.student.id);
  });
  const valid = results.filter((r) => r.student).map((r) => r.student as Student);
  const invalid = results.length - valid.length;

  const doImport = () => {
    if (!valid.length) return;
    importStudents(valid, mode);
    toast.success(`Imported ${valid.length} students${invalid ? ` (${invalid} skipped)` : ""}. Dashboard recalculated.`);
    setFile(null);
  };

  const exportScores = () => download("edupulse-student-scores.csv", toCSV([
    ["id", "name", "department", "year", "cgpa", "attendance", "success_score", "category", "data_completeness_pct", "placement_readiness", "academic_risk", "flag_count"],
    ...filtered.map((s) => [s.id, s.name, s.department, s.year, s.cgpa, s.attendance, s.success, s.category, Math.round(s.completeness * 100), s.readiness, s.academicRisk, s.flags.length]),
  ]));
  const exportRisk = () => download("edupulse-risk-report.csv", toCSV([
    ["id", "name", "department", "year", "academic_risk", "flag", "indicator", "recommended_action"],
    ...filtered.flatMap((s) => s.flags.map((f) => [s.id, s.name, s.department, s.year, s.academicRisk, f.label, f.indicator, f.action])),
  ]));

  return (
    <>
      <PageHeader title="CSV Import & Reports" subtitle={`Current dataset: ${views.length} students (${hasImported ? "includes imported records" : "synthetic demo data"}).`}
        actions={<Button variant="outline" onClick={() => { resetDemo(); toast.success("Restored synthetic demo data"); }}><RotateCcw className="h-4 w-4" /> Reset to demo data</Button>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="1. Upload CSV" className="lg:col-span-2" action={<Button size="sm" variant="ghost" onClick={() => download("edupulse-template.csv", templateCSV())}><Download className="h-4 w-4" /> Template</Button>}>
          <label className={cn("flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition hover:border-primary hover:bg-accent/40", loading && "opacity-60")}>
            <FileUp className="h-8 w-8 text-primary" />
            <p className="mt-2 font-semibold">{loading ? "Reading file…" : file ? file.name : "Choose a student CSV"}</p>
            <p className="text-xs text-muted-foreground">Required columns: Student ID, Department, Year. Other indicators optional — missing values are renormalized.</p>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {error && <p role="alert" className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{error}</p>}
        </Card>
        <Card title="Reports" subtitle="Exports respect the current dashboard filters">
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={exportScores}><Download className="h-4 w-4" /> Student scores ({filtered.length})</Button>
            <Button variant="outline" className="w-full justify-start" onClick={exportRisk}><Download className="h-4 w-4" /> Risk & actions report</Button>
          </div>
        </Card>
      </div>

      {file && (
        <>
          <Card title="2. Map columns" subtitle={`${file.rows.length} rows detected`} className="mt-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((f) => (
                <div key={f.key} className="text-sm">
                  <p className="mb-1 font-medium">{f.label}{f.required && <span className="text-destructive"> *</span>}</p>
                  <Select value={String(mapping[f.key] ?? -1)} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: Number(v) }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="-1">— Not mapped —</SelectItem>{file.headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Column ${i + 1}`}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {missingRequired.length > 0 && <p className="mt-4 text-sm text-destructive">Map required fields: {missingRequired.map((f) => f.label).join(", ")}</p>}
          </Card>

          {missingRequired.length === 0 && (
            <Card title="3. Preview & validate" className="mt-6" action={
              <div className="flex items-center gap-2">
                <Select value={mode} onValueChange={(v) => setMode(v as "replace" | "append")}>
                  <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="replace">Replace current dataset</SelectItem><SelectItem value="append">Append to dataset</SelectItem></SelectContent>
                </Select>
                <Button disabled={!valid.length} onClick={doImport}>Import {valid.length} rows</Button>
              </div>}>
              <p className="mb-3 flex gap-4 text-sm"><span className="flex items-center gap-1 text-ontrack"><CheckCircle2 className="h-4 w-4" />{valid.length} valid</span><span className="flex items-center gap-1 text-destructive"><AlertCircle className="h-4 w-4" />{invalid} with errors (skipped)</span></p>
              <div className="max-h-96 overflow-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted"><tr><th className="p-2 text-left">#</th>{file.headers.map((h, i) => <th key={i} className="p-2 text-left">{h}</th>)}<th className="p-2 text-left">Validation</th></tr></thead>
                  <tbody>
                    {file.rows.slice(0, 50).map((r, i) => (
                      <tr key={i} className={cn("border-t", results[i]?.errors.length && "bg-destructive/5")}>
                        <td className="p-2 text-muted-foreground">{i + 2}</td>
                        {file.headers.map((_, j) => <td key={j} className="p-2">{r[j]}</td>)}
                        <td className="p-2">{results[i]?.errors.length ? <span className="text-destructive">{results[i]!.errors.join("; ")}</span> : <span className="text-ontrack">OK</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {file.rows.length > 50 && <p className="mt-2 text-xs text-muted-foreground">Showing first 50 of {file.rows.length} rows; all rows are validated.</p>}
            </Card>
          )}
        </>
      )}
    </>
  );
}
