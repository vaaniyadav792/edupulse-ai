# EduPulse AI — Smart Campus Analytics

Predict, optimize & improve student success. Built with React 19, TypeScript, TanStack Start, Tailwind CSS v4 and Recharts.

> All bundled student records are **synthetic demo data** (fictional, deterministically generated). No real people or sensitive attributes are used.

## Features
- **Overview dashboard** – KPIs and charts computed live from the dataset, with department / year / category filters.
- **All Students** – searchable, sortable, paginated table → detailed profile.
- **Student Profile** – score breakdown, data completeness, rule-based risk explanation, interventions.
- **Academic Analytics**, **Placement Readiness**, **Segmentation**.
- **Risk & Interventions** – flags with actual indicators + recommended actions; create/track support actions (mentor, due date, notes, status).
- **What-If Simulator** – hypothetical scenarios using the same scoring formulas; never modifies the original record.
- **CSV Import & Reports** – upload, map columns, validate, preview, import (replace/append), export reports.

## Scoring
Success Score (0–100) = Academic 30% · Attendance 20% · LMS & assignments 15% · Placement readiness 20% · Skills & certifications 10% · Engagement 5%. Missing components are excluded and remaining weights renormalized; completeness is shown.
Placement Readiness = Aptitude 25% · Coding 25% · Mock interview 25% · Soft skills 15% · Placement training 10%.
Risk flags are **transparent threshold rules**, not machine-learning predictions. See `src/lib/scoring.ts`.

Data (including imports and interventions) is stored in the browser's localStorage. Use "Reset to demo data" to restore.

## Setup
```bash
bun install   # or npm install
bun run dev   # http://localhost:8080
bunx vitest run
```

## Export to GitHub
In the Lovable editor, open **Connectors → GitHub**, authorize, and create the repository. Changes sync both ways. Then `git clone` the repo and run the setup steps above.
