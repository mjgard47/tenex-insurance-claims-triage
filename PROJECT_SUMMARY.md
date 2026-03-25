# Tenex Insurance Claims Triage Platform — Complete Project Summary

## 1. Project Overview

The Tenex Insurance Claims Triage Platform is an AI-powered system that automatically routes auto insurance collision claims to the correct adjuster queue based on deterministic risk assessment and fraud detection. The AI makes triage recommendations — it does not make final approve/deny decisions. Licensed claims adjusters retain full decision authority.

**Target use case:** Collision claims intake triage for mid-size insurers processing 5,000-15,000 claims per month.

**Current state:** Running on localhost with 55 pre-loaded synthetic claims in a SQLite database. All features are functional and demo-ready. Backend runs on http://127.0.0.1:8000, frontend on http://localhost:5173.

---

## 2. Technical Architecture

### Backend
- **Framework:** FastAPI 0.104.1 (Python)
- **Database:** SQLite (file-based, auto-created at `backend/claims.db`)
- **Models:** Pydantic 2.5.0 for data validation
- **Dependencies:** uvicorn 0.24.0 (server), pandas 2.1.4 (CSV processing), python-multipart 0.0.6 (file uploads)

### Frontend
- **Framework:** React 18.2.0
- **Build tool:** Vite 5.0.0
- **Styling:** Tailwind CSS 3.3.0 (utility classes only, no custom CSS)
- **HTTP client:** Axios 1.6.0
- **Config files:** `tailwind.config.cjs` and `postcss.config.cjs` (CommonJS due to `"type": "module"` in package.json)

### File Structure
```
Tenex - Insurance Claims Project/
├── PROJECT_CONTEXT.md              # Detailed project documentation
├── PROJECT_SUMMARY.md              # This file
├── README.md                       # Quick start guide
├── .gitignore                      # Excludes __pycache__, node_modules, .env, etc.
├── backend/
│   ├── app.py                      # FastAPI application, all 10 endpoints
│   ├── models.py                   # Pydantic models (ClaimInput, AIResponse, enums)
│   ├── processor.py                # Triage logic, fraud detection, reasoning engine
│   ├── db.py                       # SQLite database layer, 2 tables, 15+ functions
│   ├── database.py                 # JSON file loading helpers (legacy)
│   ├── requirements.txt            # Python dependencies
│   └── claims.db                   # SQLite database (auto-generated on startup)
├── frontend/
│   ├── package.json                # Frontend dependencies (React, Vite, Tailwind, Axios)
│   ├── vite.config.js              # Vite + React plugin config
│   ├── tailwind.config.cjs         # Tailwind content paths
│   ├── postcss.config.cjs          # PostCSS + Tailwind + Autoprefixer
│   ├── index.html                  # HTML entry point
│   └── src/
│       ├── main.jsx                # React root mount
│       ├── App.jsx                 # Main app shell, sticky nav, profile switcher
│       ├── index.css               # Tailwind directives (@tailwind base/components/utilities)
│       └── components/
│           ├── ClaimUpload.jsx     # 22-field claim submission form with validation
│           ├── BatchUpload.jsx     # CSV batch upload with template download
│           ├── Dashboard.jsx       # Analytics dashboard (11 platform + 4 personal metrics)
│           ├── QueueView.jsx       # Tabbed queue tables with filtering and pagination
│           └── ClaimDetailModal.jsx # Full claim detail modal with workflow actions
├── data/
│   └── claims.json                 # 55 synthetic test claims
├── docs/                           # Empty (pending)
├── tests/                          # Empty (pending)
├── presentation/                   # Empty (pending)
└── outputs/                        # Empty (pending)
```

---

## 3. API Endpoints

| Method | Path | Purpose | Parameters |
|--------|------|---------|------------|
| POST | `/process` | Triage single claim, auto-assign, save to DB | Body: ClaimInput JSON |
| POST | `/process_batch` | Upload CSV, process all rows, return summary | File: CSV upload |
| GET | `/dashboard/metrics` | Platform + personal metrics | Query: `adjuster_name` (optional) |
| GET | `/queue/{queue_type}` | Claims filtered by queue | Path: fast_track, standard_review, escalation |
| PUT | `/claims/{claim_id}/status` | Update claim status | Query: `status` (In Review, Approved, Denied, Escalated) |
| PUT | `/claims/{claim_id}/escalate` | Escalate claim to higher queue | Query: `escalated_from`, `escalated_to_queue`, `escalation_notes` |
| GET | `/workload/{queue_type}` | Adjuster workload counts per queue | Path: fast_track, standard_review, escalation |
| GET | `/claims` | All claims from claims.json | None |
| GET | `/claims/{claim_id}` | Single claim by ID | Path: claim_id |
| GET | `/responses/{claim_id}` | Single AI response by claim ID | Path: claim_id |

**Startup behavior:** `init_db()` runs on app start — creates tables if missing, pre-loads 55 claims from `data/claims.json` if database is empty.

**CORS:** All origins allowed (development mode).

---

## 4. Database Schema

### Table: processed_claims (27 columns)

| Column | Type | Purpose |
|--------|------|---------|
| id | INTEGER PK | Auto-increment primary key |
| claim_id | TEXT UNIQUE | Unique claim identifier (CLM-2024-001) |
| decision | TEXT | AI triage decision: fast_track, standard_review, escalation |
| queue | TEXT | Current queue: Fast-Track Queue, Standard Review Queue, Senior Review Queue |
| recommended_adjuster | TEXT | AI-recommended adjuster type |
| estimated_review_time | TEXT | Expected review duration |
| estimated_payout_range | TEXT | Payout estimate or "TBD" (nullable) |
| confidence_score | REAL | AI confidence 0.0-1.0 |
| processing_time_seconds | REAL | AI processing time (~0.5-2.0 sec) |
| reasoning | TEXT | Deterministic reasoning citing exact field values |
| fraud_signals | TEXT | JSON array of detected fraud signals |
| policy_verification | TEXT | Policy details string |
| damage_assessment | TEXT | Vehicle and damage details string |
| next_steps | TEXT | JSON array of recommended next steps |
| escalation_reason | TEXT | AI escalation reason (nullable) |
| criteria_checks | TEXT | JSON array of 6 CriteriaCheck objects |
| payout_calculation | TEXT | JSON PayoutCalculation or null |
| timestamp | TEXT | ISO datetime of AI processing |
| claim_data | TEXT | Full original ClaimInput as JSON (all 22 fields) |
| assigned_to | TEXT | Current adjuster name |
| assigned_at | TEXT | ISO datetime of assignment |
| status | TEXT | Assigned, In Review, Approved, Denied, Escalated |
| status_updated_at | TEXT | ISO datetime of last status change |
| escalated_from | TEXT | Adjuster who escalated (nullable) |
| escalated_to_queue | TEXT | Target queue for escalation (nullable) |
| escalation_notes | TEXT | Escalation reason notes (nullable) |
| escalation_timestamp | TEXT | ISO datetime of escalation (nullable) |
| created_at | TIMESTAMP | Auto-set on insert |

### Table: audit_log (7 columns)

| Column | Type | Purpose |
|--------|------|---------|
| id | INTEGER PK | Auto-increment |
| claim_id | TEXT | Which claim changed |
| old_status | TEXT | Previous status |
| new_status | TEXT | New status |
| changed_by | TEXT | Adjuster who made the change |
| changed_at | TEXT | ISO datetime |
| created_at | TIMESTAMP | Auto-set on insert |

Every status change (In Review, Approved, Denied, Escalated) writes a row to audit_log for compliance tracking. Captures who changed it, when, and what the previous state was.

---

## 5. Features Implemented (By Phase)

### Phase 1: Backend Foundation
- FastAPI application with CORS
- Pydantic models: ClaimInput (22 fields), AIResponse (15 fields)
- 3 collision type enums (9 collision types, 4 fault types, 3 decision types)
- Deterministic triage logic with exact threshold-based routing
- 4 fraud signal detection rules
- Template-based reasoning that cites exact field values
- Policy verification and damage assessment generators
- Context-specific next steps per decision type

### Phase 2: Frontend + Claim Form
- React + Vite + Tailwind CSS setup
- 22-field claim submission form organized into 4 sections
- Comprehensive client-side validation (empty fields, numeric ranges, required checks)
- Red border highlighting on invalid fields
- Error summary with scroll-to-view
- Inline triage result display after submission
- Loading spinner in submit button

### Phase 3A: Database + Dashboard
- SQLite database with auto-initialization
- Pre-loads 55 synthetic claims on first startup
- Dashboard with 5 core metrics: Total Processed, Time Saved, Cost Savings, Processing Speed, Avg Confidence
- Dashboard auto-refreshes after claim submission

### Phase 3B: Batch Upload + CSV Template
- CSV file upload via FormData
- Sample CSV template download (3 example rows matching all 22 fields)
- Collapsible column reference documentation
- Batch processing results: total/processed/skipped counts
- Queue distribution badges for batch results
- Collapsible per-row error details

### Phase 3C: Queue Management
- 3 queue tabs (Fast-Track, Standard Review, Senior Review) + All tab
- Sortable claims table (newest/oldest first)
- Pagination (10 claims per page)
- CSV export for queue data
- Click-to-open claim detail modal
- Fraud signal count badges
- Status column with color-coded badges

### Phase 3D: Claim Detail Modal
- Full claim detail view with 18 information sections
- Decision Breakdown with checkmark/X visualization for 6 criteria
- Step-by-step payout calculation display (fast-track only)
- Collapsible "Full Claim Details" section
- Optimized layout: decision info at top, reference data below
- Regulatory compliance disclaimer
- Integration link to external claims management system (mock)

### Phase 4A: Workflow Core
- **Auto-assignment:** Claims automatically assigned to least-busy adjuster in target queue
- **Adjuster roster:** 6 adjusters across 3 tiers (Junior 1-2, Standard 1-2, Senior 1-2)
- **Status tracking:** Assigned → In Review → Approved/Denied/Escalated
- **Enforced workflow:** Must mark "In Review" before Approve/Deny (buttons swap in-place without closing modal)
- **Escalation with notes:** Escalation modal with required text explanation, auto-reassigns to least-busy adjuster in target queue
- **Escalation paths:** Fast-Track → Standard Review → Senior Review (one level at a time)
- **Escalation display:** Purple banner shows who escalated, when, and why. Original AI recommendation collapses into toggle.
- **Audit logging:** Every status change writes to audit_log table
- **Profile switcher:** 7 profiles (Admin + 6 adjusters) in header dropdown
- **View toggle:** "Show only my claims" checkbox for adjuster views
- **Queue access control:** Adjusters can only see their assigned queue (others grayed out)
- **Status filter:** Pending/Finished/All toggle for queue table
- **Workload balancing:** Excludes Approved/Denied claims from workload counts

### Phase 4B: Enhanced Dashboard
- **6 new platform metrics:** Status Breakdown (bar chart), Avg Time to Decision (overall + by queue), Escalation Rate (with industry comparison), Fast-Track Success Rate (with target), Projected Annual Savings (extrapolated to 10K claims/month), updated Cost Savings
- **4 personal metrics (adjuster view only):** My Pending Claims, My Avg Decision Time, My Approval Rate, My Escalation Rate
- **Live updates:** Dashboard refreshes after any status change (approve, deny, escalate) from queue modal
- **Profile-aware:** Switches between platform-only (Admin) and personal + platform (adjuster) views

---

## 6. Triage Logic Rules

### Fast-Track Queue (ALL must be true)
| Criterion | Threshold |
|-----------|-----------|
| Damage amount | < $5,000 |
| Fault determination | other_party OR shared |
| Police report | Filed (true) |
| Prior claims count | <= 1 |
| Fraud signals | None detected |

Routes to: Junior Claims Adjuster. Review time: 1-2 business days. Confidence: 90-97%.
Payout estimate: damage_amount - deductible.

### Standard Review Queue (default — not fast-track, not escalation)
Reasoning explains exactly which fast-track criteria failed. Routes to: Standard Claims Adjuster. Review time: 2-4 business days. Confidence: 70-85%. Payout: TBD pending investigation.

### Senior Review Queue (ANY triggers escalation)
| Trigger | Criteria |
|---------|----------|
| Fraud signals | Any of 4 fraud checks detected |
| Exceeds coverage | damage > policy_coverage_limit |
| High-dollar | damage > $15,000 |
| At-fault + high damage | fault = policyholder AND damage > $7,500 |

Routes to: Senior Claims Adjuster (or SIU if fraud). Review time: 3-10 business days. Confidence: 82-95%.

### Fraud Signal Detection (4 rules)
| Signal | Trigger |
|--------|---------|
| Inconsistent damage | airbags_deployed = true AND vehicle_drivable = true |
| High-value + high-mileage | mileage > 150,000 AND damage > $8,000 |
| No police report on high-value | police_report = false AND damage > $7,500 |
| Excessive claims history | prior_claims > 3 |

### AI Reasoning
All reasoning is deterministic template strings citing exact field values. No LLM generates reasoning. Zero hallucination risk. Examples:
- Fast-track: "Damage $3,200.00 < $5,000 threshold. Fault: other party. Police report: filed. Prior claims: 0 (threshold: 1). No fraud signals detected."
- Standard: "Did not meet fast-track criteria. Failed: fault: policyholder (requires other party or shared). Failed: no police report filed. No escalation triggers found."
- Escalation: "1 fraud signal(s) detected: No police report on high-value claim (>$7,500). Policyholder at fault with significant damage ($8,900.00)."

---

## 7. User Roles & Permissions

| Profile | Queue Access | Default View | Can Escalate To |
|---------|-------------|-------------|----------------|
| Admin | All queues + All tab | All claims, no filter | N/A (viewer) |
| Junior Adjuster 1 | Fast-Track only | My claims (filtered) | Standard Review |
| Junior Adjuster 2 | Fast-Track only | My claims (filtered) | Standard Review |
| Standard Adjuster 1 | Standard Review only | My claims (filtered) | Senior Review |
| Standard Adjuster 2 | Standard Review only | My claims (filtered) | Senior Review |
| Senior Adjuster 1 | Senior Review only | My claims (filtered) | Cannot escalate further |
| Senior Adjuster 2 | Senior Review only | My claims (filtered) | Cannot escalate further |

- Admin sees all queues, no "Show only my claims" toggle, no action buttons context
- Adjusters see only their queue tab (others grayed out), "Show only my claims" checked by default
- Adjusters can uncheck "Show only my claims" to see all claims in their queue
- Profile switcher is client-side only (no authentication)

---

## 8. Workflow States

### Claim Lifecycle
```
Triaged → Assigned → In Review → Approved
                                → Denied
                   → Escalated → (re-assigned in higher queue) → In Review → Approved/Denied
```

### Status Transitions
| From | To | Trigger |
|------|-----|---------|
| Assigned | In Review | Adjuster clicks "Mark In Review" |
| Assigned | Escalated | Adjuster clicks "Escalate" with notes |
| In Review | Approved | Adjuster clicks "Approve Claim" |
| In Review | Denied | Adjuster clicks "Deny Claim" (prompts for reason) |
| In Review | Escalated | Adjuster clicks "Escalate" with notes |
| Escalated | In Review | Receiving adjuster clicks "Mark In Review" |

**Enforced order:** Cannot approve/deny directly from Assigned. Must go through In Review first. Buttons swap in-place within the modal (no close/reopen needed).

### Escalation Paths
- Fast-Track Queue → Standard Review Queue
- Standard Review Queue → Senior Review Queue
- Senior Review Queue → Cannot escalate (highest level)

On escalation: claim moves to target queue, auto-assigned to least-busy adjuster, status set to "Escalated", escalation notes stored, audit log entry created.

---

## 9. Metrics & ROI Calculations

### Platform Metrics (all from real database queries)

| Metric | Calculation |
|--------|-------------|
| Total Claims Processed | `COUNT(*)` from processed_claims |
| Time Saved | total_claims × 2.0 hours |
| Cost Saved | total_claims × $70 (2 hours × $35/hour) |
| Projected Annual Savings | (cost_saved / total_claims) × 10,000 × 12 |
| Processing Speed | `AVG(processing_time_seconds)` |
| Avg Time to Decision | `AVG(status_updated_at - assigned_at)` for Approved/Denied claims, in days |
| Escalation Rate | `COUNT(status='Escalated') / COUNT(*)` × 100 |
| Fast-Track Success | `COUNT(decision='fast_track' AND status='Approved') / COUNT(decision='fast_track')` × 100 |
| Status Breakdown | `GROUP BY status` counts |
| Queue Distribution | `GROUP BY queue` counts |

### Personal Metrics (per adjuster)

| Metric | Calculation |
|--------|-------------|
| Pending Claims | `COUNT(*)` where assigned_to = adjuster AND status NOT IN (Approved, Denied) |
| Avg Decision Time | `AVG(status_updated_at - assigned_at)` for adjuster's Approved/Denied claims |
| Approval Rate | `COUNT(status='Approved') / COUNT(status IN ('Approved','Denied'))` × 100 |
| Escalation Rate | `COUNT(escalated_from = adjuster) / COUNT(assigned_to = adjuster)` × 100 |

### ROI Assumptions
- 15 minutes saved per claim (manual triage → AI triage in ~1.2 seconds)
- $35/hour adjuster cost → $70 saved per claim (2 hours)
- Scale assumption: 10,000 claims/month for projected annual
- At 55 claims: $3,850 saved → projected $8.4M annually at scale

---

## 10. Known Limitations & Mock Features

| Item | Current State | Production Requirement |
|------|--------------|----------------------|
| Authentication | Client-side profile switcher (dropdown) | Real auth (Supabase, Auth0, Okta) |
| Action buttons | Update database status, no real payment | Payment system integration |
| Database | SQLite file on disk | PostgreSQL or cloud database |
| Deployment | Localhost only | Railway (backend) + Vercel (frontend) |
| Email notifications | Not built | Designed, needs implementation |
| Photo upload | Mock integration link shown | Document management system |
| Denial reason | Collected via prompt(), not stored | Store in database with audit trail |
| CSV intake only | Manual form + CSV batch | Real-time API integration |
| Claims system link | Shows alert explaining integration | Direct deep-link to Guidewire/Duck Creek |
| Confidence score | Randomized within range per decision type | ML-based confidence from historical data |
| Avg Confidence metric | Placeholder 93% (removed in latest) | Calculated from real data |

---

## 11. Testing Coverage

### Manually Tested
- Single claim submission (all 3 triage outcomes)
- Batch CSV upload (3-row template, error handling)
- Form validation (empty fields, zero damage, whitespace)
- Dashboard live-refresh after claim submission
- Dashboard live-refresh after approve/deny/escalate
- Queue tab switching (Fast-Track, Standard, Senior, All)
- Queue pagination (10 per page, previous/next)
- Status filter (Pending/Finished/All)
- Profile switching (all 7 profiles)
- Queue access restriction (grayed tabs for wrong role)
- "Show only my claims" filter toggle
- Mark In Review → Approve/Deny flow (in-place button swap)
- Escalation with notes (Fast-Track → Standard, Standard → Senior)
- Escalation info display on receiving end
- Collapsible original AI recommendation after escalation
- CSV export from queue view
- Sample CSV template download
- Decision Breakdown checkmarks/X marks
- Payout calculation display
- Regulatory disclaimer display

### Edge Cases Handled
- Division by zero in rate calculations (returns 0%)
- Null/missing status (defaults to "Assigned")
- Empty fraud signals array (shows dash)
- Null assigned_to (shows "Unassigned")
- Null escalation fields (sections hidden)
- Empty escalation notes (confirm button disabled)
- Cancel escalation (no side effects)
- Profile switch closes open modal
- Page resets to 1 on queue/filter change

---

## 12. Integration Strategy

### API-First Architecture
The backend exposes a clean REST API that can be consumed by any frontend or integrated into existing systems:
- `POST /process` accepts standard JSON — any system can submit claims
- `GET /queue/{type}` returns structured data — can feed existing dashboards
- `PUT /claims/{id}/status` accepts status updates — can be called from existing workflows

### Integration Points (Demonstrated)
1. **Claims Management System** — "View Full Claim" button in modal shows where deep-link to Guidewire/Duck Creek would go
2. **CSV Batch Import** — Sample template ensures column compatibility with existing data exports
3. **Webhook-ready** — Status changes write to audit_log, ready for webhook triggers (email, Slack, etc.)

### Pilot Deployment Plan
1. Deploy backend to Railway, frontend to Vercel
2. Point at insurer's claims data export (CSV)
3. Run AI triage in parallel with existing manual process
4. Compare AI recommendations vs actual adjuster decisions
5. Measure accuracy, time savings, and routing efficiency
6. Gradually increase AI authority based on accuracy metrics

---

## 13. Next Phase Roadmap (Not Built)

### Phase 5: Workflow Tracking
- `claim_workflow` table tracking step-by-step progress per claim
- Visual progress bar (pending → in_progress → completed)
- Stale claim detection (stuck >5 business days)
- Role-based step permissions
- Efficiency timing: assignment → pickup → decision

### Phase 6: Investigation Support
- Photo upload and storage (Pinata/S3)
- Document extraction (OCR for police reports, repair estimates)
- AI-assisted damage assessment from photos
- Structured document parsing

### Phase 7: Advanced Analytics
- Adjuster performance leaderboards
- Trend analysis (claim volume by week/month)
- Fraud pattern detection across claims
- Predictive analytics for claim outcomes

### Phase 8: Production Deployment
- PostgreSQL migration
- Real authentication (Auth0/Okta SSO)
- Role-based access control (RBAC) at API level
- Email/SMS notifications via SendGrid/Twilio
- Cloud deployment (Railway + Vercel or AWS)
- CI/CD pipeline
- Monitoring and alerting

---

## 14. Running the Application

**Backend:**
```bash
cd "C:\Users\Michael Gardner\Desktop\Tenex - Insurance Claims Project"
python -m uvicorn backend.app:app --reload
```
Runs on http://127.0.0.1:8000 — Swagger docs at http://127.0.0.1:8000/docs

**Frontend:**
```bash
cd "C:\Users\Michael Gardner\Desktop\Tenex - Insurance Claims Project\frontend"
npm run dev
```
Runs on http://localhost:5173

**Database reset (only needed for schema changes):**
```bash
del backend\claims.db
python -m uvicorn backend.app:app --reload
```
Auto-recreates with 55 pre-loaded claims.

---

## 15. GitHub Repository

**URL:** https://github.com/mjgard47/tenex-insurance-claims-triage

**Commits:**
1. Initial project structure
2. Phase 2: Realistic triage logic + frontend display
3. Phase 3: Full claims triage platform (active development)
4. Phase 3: Production-ready triage platform with UI polish
5. (Pending) Phase 4: Workflow, escalation, dashboard enhancements
