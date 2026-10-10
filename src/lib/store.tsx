import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { demoInterventions, generateDemoStudents } from "./demo-data";
import { evaluate } from "./scoring";
import type { Intervention, Student, StudentView } from "./types";

export interface Filters { department: string; year: string; category: string }
const KEY = "edupulse:v1";

interface Store {
  ready: boolean;
  students: Student[];
  views: StudentView[];
  filtered: StudentView[];
  departments: string[];
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  interventions: Intervention[];
  saveIntervention: (i: Intervention) => void;
  deleteIntervention: (id: string) => void;
  importStudents: (rows: Student[], mode: "replace" | "append") => void;
  resetDemo: () => void;
  hasImported: boolean;
}

// Keep one context instance across hot reloads so provider and consumers always match.
const g = globalThis as { __edupulseCtx?: ReturnType<typeof createContext<Store | null>> };
const Ctx = (g.__edupulseCtx ??= createContext<Store | null>(null));

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [students, setStudents] = useState<Student[]>(() => generateDemoStudents());
  const [interventions, setInterventions] = useState<Intervention[]>(() => demoInterventions());
  const [filters, setF] = useState<Filters>({ department: "all", year: "all", category: "all" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (Array.isArray(d.students) && d.students.length) setStudents(d.students);
        if (Array.isArray(d.interventions)) setInterventions(d.interventions);
      }
    } catch {
      localStorage.removeItem(KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify({ students, interventions }));
  }, [ready, students, interventions]);

  const views = useMemo(() => students.map(evaluate), [students]);
  const departments = useMemo(() => [...new Set(students.map((s) => s.department))].sort(), [students]);
  const filtered = useMemo(
    () => views.filter((s) =>
      (filters.department === "all" || s.department === filters.department) &&
      (filters.year === "all" || String(s.year) === filters.year) &&
      (filters.category === "all" || s.category === filters.category)),
    [views, filters],
  );

  const setFilters = useCallback((f: Partial<Filters>) => setF((p) => ({ ...p, ...f })), []);
  const saveIntervention = useCallback((i: Intervention) => setInterventions((p) => (p.some((x) => x.id === i.id) ? p.map((x) => (x.id === i.id ? i : x)) : [i, ...p])), []);
  const deleteIntervention = useCallback((id: string) => setInterventions((p) => p.filter((x) => x.id !== id)), []);
  const importStudents = useCallback((rows: Student[], mode: "replace" | "append") => {
    setStudents((p) => (mode === "replace" ? rows : [...p, ...rows]));
    setF({ department: "all", year: "all", category: "all" });
  }, []);
  const resetDemo = useCallback(() => {
    setStudents(generateDemoStudents());
    setInterventions(demoInterventions());
    setF({ department: "all", year: "all", category: "all" });
  }, []);

  const value: Store = {
    ready, students, views, filtered, departments, filters, setFilters, interventions,
    saveIntervention, deleteIntervention, importStudents, resetDemo,
    hasImported: students.some((s) => s.source === "imported"),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}
