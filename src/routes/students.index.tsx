import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CategoryBadge, Empty, FilterBar, PageHeader, RiskBadge, fmt } from "@/components/app/ui-bits";
import { useStore } from "@/lib/store";
import type { StudentView } from "@/lib/types";

export const Route = createFileRoute("/students/")({
  head: () => ({
    meta: [
      { title: "All Students — EduPulse AI" },
      { name: "description", content: "Searchable, sortable list of students with Success Score, risk and placement readiness." },
      { property: "og:title", content: "All Students — EduPulse AI" },
      { property: "og:description", content: "Searchable, sortable list of students with Success Score, risk and placement readiness." },
    ],
  }),
  component: StudentsPage,
});

type Key = "id" | "department" | "year" | "cgpa" | "attendance" | "success" | "academicRisk" | "readiness";
const COLS: { key: Key; label: string }[] = [
  { key: "id", label: "Student" }, { key: "department", label: "Dept" }, { key: "year", label: "Year" }, { key: "cgpa", label: "CGPA" },
  { key: "attendance", label: "Attendance" }, { key: "success", label: "Success Score" }, { key: "academicRisk", label: "Academic risk" }, { key: "readiness", label: "Placement" },
];
const riskOrder = { High: 3, Moderate: 2, Low: 1 };

function StudentsPage() {
  const { filtered } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "success", dir: 1 });
  const [page, setPage] = useState(0);
  const per = 20;

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = filtered.filter((s) => !t || s.id.toLowerCase().includes(t) || s.name.toLowerCase().includes(t) || s.department.toLowerCase().includes(t));
    const val = (s: StudentView) => (sort.key === "academicRisk" ? riskOrder[s.academicRisk] : s[sort.key]);
    return [...list].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va === null) return 1;
      if (vb === null) return -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  }, [filtered, q, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / per));
  const shown = rows.slice(page * per, page * per + per);

  return (
    <>
      <PageHeader title="All Students" subtitle="Click a row to open the full student profile." />
      <FilterBar />
      <Card>
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by ID, name or department" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </div>
        {rows.length === 0 ? <Empty /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    {COLS.map((c) => (
                      <th key={c.key} className="px-3 py-2 font-semibold">
                        <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((p) => ({ key: c.key, dir: p.key === c.key ? (p.dir === 1 ? -1 : 1) : 1 }))}>
                          {c.label}{sort.key === c.key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((s) => (
                    <tr key={s.id} tabIndex={0} className="cursor-pointer border-b last:border-0 hover:bg-accent/60 focus:bg-accent/60 focus:outline-none"
                      onClick={() => navigate({ to: "/students/$id", params: { id: s.id } })}
                      onKeyDown={(e) => e.key === "Enter" && navigate({ to: "/students/$id", params: { id: s.id } })}>
                      <td className="px-3 py-2.5"><p className="font-semibold">{s.id}</p><p className="text-xs text-muted-foreground">{s.name}</p></td>
                      <td className="px-3">{s.department}</td>
                      <td className="px-3">{s.year}</td>
                      <td className="px-3">{fmt(s.cgpa, 2)}</td>
                      <td className="px-3">{s.attendance === null ? "—" : `${s.attendance}%`}</td>
                      <td className="px-3"><div className="flex items-center gap-2"><b>{fmt(s.success, 1)}</b><CategoryBadge c={s.category} /></div></td>
                      <td className="px-3"><RiskBadge r={s.academicRisk} /></td>
                      <td className="px-3">{fmt(s.readiness, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{rows.length} students · page {page + 1} of {pages}</span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-md border px-3 py-1 disabled:opacity-40">Prev</button>
                <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="rounded-md border px-3 py-1 disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
