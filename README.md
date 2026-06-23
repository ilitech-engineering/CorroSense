# CorroSense – Pipeline Integrity Intelligence Platform

**Industrial-grade pipeline inspection data analysis and defect management MVP.**

Built for oil & gas / pipeline integrity engineering teams. Enables structured
upload, asynchronous AI-powered analysis, defect prioritization, and export of
ILI (Inline Inspection / smart pigging) inspection data.

---

## Architecture Overview

```
┌─────────────────────────────┐     ┌────────────────────────┐
│   Next.js Frontend (Vercel) │────▶│  Supabase              │
│   - Auth UI                 │     │  - Postgres (RLS)      │
│   - Dashboard & tables      │◀────│  - Auth                │
│   - File upload UX          │     │  - Storage (private)   │
│   - Job polling             │     └────────────────────────┘
└─────────────┬───────────────┘              ▲
              │ POST /analyze-run            │ write results
              ▼                              │
┌─────────────────────────────┐             │
│  FastAPI Analysis Service   │─────────────┘
│  (Railway / Render / VPS)   │
│  - File fetch & parse       │
│  - Mock analyzer engine     │
│  - Defect detection         │
│  - Segment risk scoring     │
└─────────────────────────────┘
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Python 3.11+
- Supabase account (free tier works)
- Git

---

### 1. Clone and set up the project

```bash
git clone <your-repo>
cd corrosense
```

---

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run migrations in order:
   ```
   supabase/migrations/001_schema.sql
   supabase/migrations/002_rls.sql
   supabase/migrations/003_seed.sql
   supabase/migrations/004_storage.sql
   ```
3. Go to **Authentication → Settings**:
   - Enable email/password sign-in
   - Disable email confirmation for local dev
4. Create a demo user:
   - Go to **Authentication → Users → Add user**
   - Email: `demo@corrosense.dz`, Password: `demo123456`
5. Copy your **Project URL** and **anon key** from **Settings → API**

---

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env.local
# Fill in your Supabase URL, anon key, and service role key
npm install
npm run dev
```

App runs at http://localhost:3000

---

### 4. Backend (Analysis Service) Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SERVICE_KEY
uvicorn app.main:app --reload --port 8000
```

Service runs at http://localhost:8000

Check health: http://localhost:8000/health

---

### 5. Upload a demo file and run analysis

1. Log in as `demo@corrosense.dz` / `demo123456`
2. Navigate to **Projects → GK3 Trunk Line Assessment 2024**
3. Open the inspection run **GK3 MFL Run – March 2024**
4. Upload `seed/demo_inspection_gk3_sample.csv`
5. Click **Analyze**
6. Watch the job status update; results populate automatically

---

## Project Structure

```
corrosense/
├── frontend/                    # Next.js 14 app (Vercel)
│   ├── app/
│   │   ├── dashboard/           # Main dashboard
│   │   ├── projects/            # Projects list and detail
│   │   ├── pipelines/           # Pipeline management
│   │   ├── runs/[id]/           # Run detail (critical page)
│   │   ├── defects/             # Defects explorer
│   │   ├── settings/            # Org & user settings
│   │   ├── auth/login/          # Login page
│   │   ├── auth/signup/         # Signup page
│   │   └── api/                 # Next.js API routes
│   │       ├── runs/[id]/analyze/   # POST → trigger analysis
│   │       ├── runs/[id]/results/   # GET → export results
│   │       └── jobs/[id]/           # GET → poll job status
│   ├── components/
│   │   ├── layout/              # Sidebar, Header, AppShell
│   │   ├── ui/                  # KpiCard, StatusBadge, EmptyState
│   │   ├── runs/                # AnalyzeButton, FileUploadZone
│   │   └── charts/              # DefectCharts (Recharts)
│   ├── lib/
│   │   ├── supabase/            # Browser + server clients
│   │   └── utils.ts             # Formatting, color helpers
│   └── types/index.ts           # All TypeScript types
│
├── backend/                     # FastAPI analysis service
│   └── app/
│       ├── main.py              # FastAPI app entry point
│       ├── core/
│       │   ├── config.py        # Settings (pydantic-settings)
│       │   └── supabase.py      # Service-role DB client
│       ├── api/
│       │   ├── health.py        # GET /health
│       │   ├── analyze.py       # POST /analyze-run
│       │   └── jobs.py          # GET /jobs/{id}
│       ├── services/
│       │   ├── analyzer.py      # Core mock analysis engine
│       │   ├── file_parser.py   # CSV/JSON parser & validator
│       │   └── job_runner.py    # Job orchestration workflow
│       ├── workers/
│       │   └── job_worker.py    # ThreadPoolExecutor worker
│       └── schemas/
│           └── analysis.py      # Pydantic request/response models
│
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql       # Full database schema
│       ├── 002_rls.sql          # Row Level Security policies
│       ├── 003_seed.sql         # Demo data
│       └── 004_storage.sql      # Storage buckets + policies
│
└── seed/
    └── demo_inspection_gk3_sample.csv   # Demo input file
```

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npx vercel deploy
```

Set environment variables in Vercel dashboard:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANALYZER_SERVICE_URL=https://your-api.railway.app
ANALYZER_SERVICE_KEY=your-shared-secret
```

### Analysis Service → Railway

1. Push your code to GitHub
2. Create new Railway project → Deploy from GitHub
3. Set root directory: `backend/`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Set environment variables matching `backend/.env.example`
6. Copy the generated Railway URL to `ANALYZER_SERVICE_URL` in Vercel

### Analysis Service → Render

1. New Web Service → Connect GitHub repo
2. Root directory: `backend`
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables

### Analysis Service → VPS (Ubuntu)

```bash
git clone <your-repo> /opt/corrosense
cd /opt/corrosense/backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env && nano .env  # fill in values

# Install as systemd service
sudo nano /etc/systemd/system/corrosense-api.service
```

```ini
[Unit]
Description=CorroSense Analysis Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/corrosense/backend
Environment="PATH=/opt/corrosense/backend/venv/bin"
ExecStart=/opt/corrosense/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable corrosense-api
sudo systemctl start corrosense-api
```

---

## AI Analysis Engine

### Current: Mock Analyzer (Layer A)

The mock analyzer is **deterministic and explainable** — not random.

**Formula summary:**
| Metric | Formula |
|---|---|
| metal_loss_mm | nominal_thickness - wall_thickness |
| depth_percent | metal_loss / nominal * 100 |
| corrosion_probability | 0.45×depth + 0.35×anomaly + 0.20×signal |
| severity | depth<10% low / 10-20% medium / 20-40% high / >40% critical |
| risk_score (0-100) | 100 × (0.5×prob + 0.3×depth/100 + 0.2×sev) × confidence |

### Upgrade Path: Real ML Models (Layer B)

The system is architected to swap in real models without redesigning the workflow:

1. Replace `MockAnalyzer` in `backend/app/services/analyzer.py`
2. The `analyze_rows()` signature stays identical
3. Options:
   - **1D-CNN**: Trained on ILI signal sequences for defect classification
   - **Regression model**: Predict exact depth_mm from signal features
   - **Anomaly detection**: Isolation Forest / Autoencoder for unknown anomalies
   - **Growth forecasting**: Time-series model across multiple runs
4. `job_runner.py`, `job_worker.py`, DB persistence — unchanged

---

## API Reference

### Next.js API Routes

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/runs/{id}/analyze` | Trigger analysis job |
| GET | `/api/jobs/{id}` | Poll job status |
| GET | `/api/runs/{id}/results?format=csv` | Export results |

### FastAPI Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service liveness check |
| POST | `/analyze-run` | Accept analysis job (202 Accepted) |
| GET | `/jobs/{job_id}` | Get job status |

---

## License

Proprietary — CorroSense MVP © 2024. Not for redistribution.
