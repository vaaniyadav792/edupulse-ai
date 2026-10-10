import { Link, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, BarChart3, Briefcase, Database, FlaskConical, LayoutDashboard, LifeBuoy, Menu, Shapes, Users, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/students", label: "All Students", icon: Users },
  { to: "/academics", label: "Academic Analytics", icon: BarChart3 },
  { to: "/placement", label: "Placement Readiness", icon: Briefcase },
  { to: "/segments", label: "Segmentation", icon: Shapes },
  { to: "/interventions", label: "Risk & Interventions", icon: LifeBuoy },
  { to: "/simulator", label: "What-If Simulator", icon: FlaskConical },
  { to: "/data", label: "CSV Import & Reports", icon: Database },
] as const;

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { views, hasImported } = useStore();
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand"><Activity className="h-5 w-5 text-primary-foreground" /></div>
        <div>
          <p className="font-display text-lg font-bold text-sidebar-accent-foreground">EduPulse AI</p>
          <p className="text-[11px] text-sidebar-foreground/70">Smart Campus Analytics</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} onClick={onNavigate} activeOptions={{ exact: to === "/" }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--sidebar-primary)]" }}>
            <Icon className="h-4 w-4" /> {label}
          </Link>
        ))}
      </nav>
      <div className="m-3 rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3 text-xs">
        <p className="font-semibold text-sidebar-accent-foreground">{hasImported ? "Imported dataset" : "Synthetic demo data"}</p>
        <p className="mt-1 text-sidebar-foreground/70">{views.length} fictional student records. Risk flags are rule-based, not ML predictions.</p>
      </div>
    </div>
  );
}

export function AppShell() {
  const { ready } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block"><Sidebar /></aside>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-card px-4 py-3 lg:hidden">
        <button aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
        <span className="font-display font-bold">EduPulse AI</span>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">
            <button aria-label="Close menu" className="absolute right-3 top-3 z-10 text-sidebar-foreground" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <main className={cn("lg:pl-64")}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {ready ? <Outlet /> : (
            <div className="space-y-4" aria-busy="true" aria-label="Loading">
              <Skeleton className="h-9 w-64" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
              <Skeleton className="h-72 rounded-xl" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
