import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import type { AcademicRisk, Category, Num } from "@/lib/types";
import { cn } from "@/lib/utils";

export const fmt = (v: Num | undefined, d = 0) => (v === null || v === undefined ? "—" : v.toFixed(d));

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, subtitle, children, className, action }: { title?: string; subtitle?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("card-surface p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-base font-semibold">{title}</h3>}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, hint, icon, tone = "primary" }: { label: string; value: string; hint?: string; icon: ReactNode; tone?: "primary" | "cyan" | "priority" | "attention" | "ontrack" }) {
  const tones = { primary: "bg-primary/10 text-primary", cyan: "bg-cyan/15 text-cyan", priority: "bg-priority/10 text-priority", attention: "bg-attention/15 text-attention", ontrack: "bg-ontrack/10 text-ontrack" };
  return (
    <div className="card-surface flex items-start gap-4 p-5">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tones[tone])}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

const catCls: Record<Category, string> = {
  "On Track": "bg-ontrack/12 text-ontrack",
  Monitor: "bg-monitor/12 text-monitor",
  "Needs Attention": "bg-attention/15 text-attention",
  "High Priority": "bg-priority/12 text-priority",
  "Insufficient Data": "bg-muted text-muted-foreground",
};
export const CATEGORY_COLOR: Record<Category, string> = {
  "On Track": "var(--ontrack)", Monitor: "var(--monitor)", "Needs Attention": "var(--attention)", "High Priority": "var(--priority)", "Insufficient Data": "var(--muted-foreground)",
};
export function CategoryBadge({ c }: { c: Category }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", catCls[c])}>{c}</span>;
}
export function RiskBadge({ r }: { r: AcademicRisk }) {
  const cls = r === "High" ? "bg-priority/12 text-priority" : r === "Moderate" ? "bg-attention/15 text-attention" : "bg-ontrack/12 text-ontrack";
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", cls)}>{r}</span>;
}

export function Empty({ title = "No students match", hint = "Try clearing filters or importing data." }: { title?: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground/60" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

export function FilterBar() {
  const { filters, setFilters, departments, filtered, views } = useStore();
  const active = filters.department !== "all" || filters.year !== "all" || filters.category !== "all";
  return (
    <div className="card-surface mb-6 flex flex-wrap items-center gap-3 p-3">
      <Select value={filters.department} onValueChange={(v) => setFilters({ department: v })}>
        <SelectTrigger className="w-40" aria-label="Department"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All departments</SelectItem>
          {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.year} onValueChange={(v) => setFilters({ year: v })}>
        <SelectTrigger className="w-32" aria-label="Year"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All years</SelectItem>
          {[1, 2, 3, 4, 5].map((y) => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.category} onValueChange={(v) => setFilters({ category: v })}>
        <SelectTrigger className="w-44" aria-label="Risk category"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {(["On Track", "Monitor", "Needs Attention", "High Priority", "Insufficient Data"] as Category[]).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      {active && <button className="text-sm font-medium text-primary hover:underline" onClick={() => setFilters({ department: "all", year: "all", category: "all" })}>Clear filters</button>}
      <span className="ml-auto text-xs text-muted-foreground">Showing <b className="text-foreground">{filtered.length}</b> of {views.length} students</span>
    </div>
  );
}

export function Meter({ value, color = "var(--primary)" }: { value: Num; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full" style={{ width: `${value ?? 0}%`, background: color }} />
    </div>
  );
}

export const tooltipStyle = { borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 };
