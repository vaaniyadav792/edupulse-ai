import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { demoInterventions, generateDemoStudents } from "./demo-data";
import { evaluate } from "./scoring";
import { predict, trainModel, type Model } from "./ml";
import { studentsFromCSVText } from "./csv";
import type { Intervention, Student, StudentView } from "./types";

export interface Filters { department: string; year: string; category: string }
const KEY = "edupulse:v2";
export const BUNDLED_DATASET_URL = "/data/student_journey_analytics.csv";
export type DatasetName = "journey" | "synthetic" | "imported";

interface Store {
  ready: boolean;
  loadError: string | null;
  dataset: DatasetName;
  students: Student[];
  views: StudentView[];
  filtered: StudentView[];
  departments: string[];
  model: Model | null;
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  interventions: Intervention[];
  saveIntervention: (i: Intervention) => void;
  deleteIntervention: (id: string) => void;
  importStudents: (rows: Student[], mode: "replace" | "append") => void;
  loadBundled: () => Promise<void>;
  loadSynthetic: () => void;
  hasImported: boolean;
}

// Keep one context instance across hot reloads so provider and consumers always match.
const g = globalThis as { __edupulseCtx?: ReturnType<typeof createContext<Store | null>> };
const Ctx = (g.__edupulseCtx ??= createContext<Store | null>(null));
const ALL: Filters = { department: "all", year: "all", category: "all" };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataset, setDataset] = useState<DatasetName>("journey");
  const [students, setStudents] = useState<Student[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [filters, setF] = useState<Filters>(ALL);

  const loadBundled = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(BUNDLED_DATASET_URL);
      if (!res.ok) throw new Error(`Dataset request failed (${res.status})`);
      const { students: rows } = studentsFromCSVText(await res.text());
      if (!rows.length) throw new Error("Bundled dataset has no valid rows");
      setStudents(rows);
      setInterventions(demoInterventions(rows.map((s) => s.id)));
      setDataset("journey");
      setF(ALL);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load dataset";
      setLoadError(msg);
      const demo = generateDemoStudents();
      setStudents(demo);
      setInterventions(demoInterventions(demo.map((s) => s.id)));
      setDataset("synthetic");
      toast.error(`${msg}. Showing synthetic demo data instead.`);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (Array.isArray(d.students) && d.students.length) {
            setStudents(d.students);
            setInterventions(Array.isArray(d.interventions) ? d.interventions : []);
            setDataset(d.dataset ?? "imported");
            setReady(true);
            return;
          }
        }
      } catch {
        localStorage.removeItem(KEY);
      }
      await loadBundled();
      setReady(true);
    })();
  }, [loadBundled]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ students, interventions, dataset }));
    } catch {
      // Storage full: data stays in memory for this session.
    }
  }, [ready, students, interventions, dataset]);

  const model = useMemo(() => trainModel(students), [students]);
  const views = useMemo(() => students.map((s) => ({ ...evaluate(s), mlRisk: model ? predict(model, s) : null })), [students, model]);
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
    setDataset("imported");
    setF(ALL);
  }, []);
  const loadSynthetic = useCallback(() => {
    const demo = generateDemoStudents();
    setStudents(demo);
    setInterventions(demoInterventions(demo.map((s) => s.id)));
    setDataset("synthetic");
    setF(ALL);
  }, []);

  const value: Store = {
    ready, loadError, dataset, students, views, filtered, departments, model, filters, setFilters, interventions,
    saveIntervention, deleteIntervention, importStudents, loadBundled, loadSynthetic,
    hasImported: dataset === "imported",
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}

export const DATASET_LABEL: Record<DatasetName, string> = {
  journey: "Student Journey Analytics dataset",
  synthetic: "Synthetic demo data",
  imported: "Imported dataset",
};
