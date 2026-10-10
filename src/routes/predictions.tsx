import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BrainCircuit } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, Empty, FilterBar, Kpi, PageHeader, RiskBadge, fmt, tooltipStyle } from "@/components/app/ui-bits";
import { useStore } from "@/lib/store";
import { featureLabel } from "@/lib/ml";

export const Route = createFileRoute("/predictions")({
  head: () => ({
    meta: [
      { title: "ML Risk Predictions — EduPulse AI" },
      { name: "description", content: "Logistic-regression risk predictions trained on labelled student outcomes, with model metrics." },
      { property: "og:title", content: "ML Risk Predictions — EduPulse AI" },
      { property: "og:description", content: "Logistic-regression risk predictions trained on labelled student outcomes, with model metrics." },
    ],
  }),
  component: Predictions,
});

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function Predictions() {
  const { model, filtered } = useStore();
  const [limit, setLimit] = useState(25);
  const d = useMemo(() => {
    const scored = filtered.filter((s) => s.mlRisk !== null);
    const bands = Array.from({ length: 10 }, (_, i) => ({ band: `${i * 10}-${i * 10 + 10}%`, count: 0, i }));
    scored.forEach((s) => bands[Math.min(9, Math.floor((s.mlRisk ?? 0) * 10))]!.count++);
    return { scored: [...scored].sort((a, b) => (b.mlRisk ?? 0) - (a.mlRisk ?? 0)), bands };
  }, [filtered]);

  if (!model) {
    return (
      <>
        <PageHeader title="ML Risk Predictions" />
        <Card><Empty title="No trained model for this dataset" hint="The model trains on a labelled 'At_Risk_Label' column (0/1). Load the Student Journey dataset or import a CSV that includes it." /></Card>
      </>
    );
  }

  const coefs = model.features.map((f, i) => ({ f: featureLabel(f), w: +model.weights[i]!.toFixed(3) })).sort((a, b) => Math.abs(b.w) - Math.abs(a.w));
  const predictedRisk = d.scored.filter((s) => (s.mlRisk ?? 0) >= model.threshold).length;
  const c = model.confusion;

  return (
    <>
      <PageHeader title="ML Risk Predictions" subtitle="A logistic-regression model trained in your browser on historical at-risk labels. Separate from the rule-based flags." />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p><b>Genuine trained model.</b> Logistic regression, {model.trainSize} training / {model.testSize} held-out test records, {model.features.length} non-sensitive features. Age, finances, fee status and wellbeing are never used. Predictions support, not replace, faculty judgement.</p>
      </div>
      <FilterBar />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Test accuracy" value={pct(model.metrics.accuracy)} icon={<BrainCircuit className="h-5 w-5" />} />
        <Kpi label="ROC AUC" value={model.metrics.auc.toFixed(3)} tone="cyan" icon={<BrainCircuit className="h-5 w-5" />} />
        <Kpi label="Precision / Recall" value={`${pct(model.metrics.precision)} / ${pct(model.metrics.recall)}`} tone="ontrack" icon={<BrainCircuit className="h-5 w-5" />} />
        <Kpi label="Predicted at risk (view)" value={String(predictedRisk)} hint={`probability ≥ ${model.threshold * 100}%`} tone="priority" icon={<BrainCircuit className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Predicted risk distribution" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.bands}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="band" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]}>{d.bands.map((b) => <Cell key={b.i} fill={b.i >= 5 ? "var(--priority)" : "var(--chart-2)"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Confusion matrix" subtitle="Held-out test set">
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div /><div className="text-xs text-muted-foreground">Pred. risk</div><div className="text-xs text-muted-foreground">Pred. safe</div>
            <div className="self-center text-xs text-muted-foreground">Actual risk</div>
            <div className="rounded-lg bg-ontrack/15 p-3 font-bold">{c.tp}</div><div className="rounded-lg bg-priority/10 p-3 font-bold">{c.fn}</div>
            <div className="self-center text-xs text-muted-foreground">Actual safe</div>
            <div className="rounded-lg bg-attention/15 p-3 font-bold">{c.fp}</div><div className="rounded-lg bg-ontrack/15 p-3 font-bold">{c.tn}</div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">F1 score {model.metrics.f1.toFixed(3)}</p>
        </Card>
        <Card title="What drives the prediction" subtitle="Standardized coefficients — positive raises risk" className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={coefs} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} /><YAxis dataKey="f" type="category" width={140} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="w" name="Coefficient" radius={4}>{coefs.map((x) => <Cell key={x.f} fill={x.w > 0 ? "var(--priority)" : "var(--ontrack)"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Highest predicted risk" subtitle="ML probability alongside rule-based risk and the recorded label" className="mt-6">
        {d.scored.length === 0 ? <Empty /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="py-2">Student</th><th>Dept</th><th>ML probability</th><th>Rule-based risk</th><th>Recorded label</th></tr></thead>
                <tbody>
                  {d.scored.slice(0, limit).map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2"><Link to="/students/$id" params={{ id: s.id }} className="font-semibold text-primary hover:underline">{s.id}</Link></td>
                      <td>{s.department}</td>
                      <td><div className="flex items-center gap-2"><div className="h-2 w-24 rounded-full bg-muted"><div className="h-2 rounded-full bg-priority" style={{ width: pct(s.mlRisk ?? 0) }} /></div><b>{pct(s.mlRisk ?? 0)}</b></div></td>
                      <td><RiskBadge r={s.academicRisk} /></td>
                      <td>{s.atRiskLabel === 1 ? "At risk" : s.atRiskLabel === 0 ? "Not at risk" : fmt(null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {limit < d.scored.length && <button className="mt-3 text-sm font-medium text-primary hover:underline" onClick={() => setLimit(limit + 50)}>Show more</button>}
          </>
        )}
      </Card>
    </>
  );
}
