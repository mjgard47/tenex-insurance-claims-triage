# Tenex — Insurance Claims Triage System

AI-powered claims triage prototype built as a Tenex AI Strategist engagement demonstration. The system automatically routes auto insurance claims to the appropriate adjuster queue based on risk assessment and fraud detection. It does NOT make final approve/deny decisions — AI assists humans, it doesn't replace them.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | FastAPI | 0.104.1 |
| Backend | Pydantic | 2.5.0 |
| Backend | pandas | 2.1.4 |
| Backend | python-multipart | 0.0.6 |
| Backend | uvicorn | 0.24.0 |
| Database | SQLite | built-in |
| Frontend | React | 18.2.0 |
| Frontend | Vite | 5.0.0 |
| Frontend | Tailwind CSS | 3.3.0 |
| Frontend | Axios | 1.6.0 |
| Frontend | PostCSS | 8.4.32 |
| Frontend | Autoprefixer | 10.4.16 |

---

## Project Structure

```
Tenex - Insurance Claims Project/
├── PROJECT_CONTEXT.md
├── README.md
├── .gitignore
├── backend/
│   ├── app.py                 # FastAPI application, all endpoints
│   ├── models.py              # Pydantic models (ClaimInput, AIResponse, enums)
│   ├── processor.py           # Triage logic, fraud detection, reasoning
│   ├── db.py                  # SQLite database layer
│   ├── database.py            # JSON file loading helpers (legacy)
│   ├── requirements.txt
│   └── claims.db              # SQLite database (auto-generated on startup)
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.cjs    # CommonJS (required due to "type": "module")
│   ├── postcss.config.cjs     # CommonJS (required due to "type": "module")
│   ├── index.html
│   └── src/
│       ├── main.jsx           # React entry point
│       ├── App.jsx            # Main app shell, 4 sections
│       ├── index.css          # Tailwind directives only
│       └── components/
│           ├── ClaimUpload.jsx      # Single claim submission (22 fields)
│           ├── BatchUpload.jsx      # CSV batch upload
│           ├── Dashboard.jsx        # Analytics metrics cards
│           ├── QueueView.jsx        # Tabbed queue tables
│           └── ClaimDetailModal.jsx # Full claim detail modal
├── data/
│   └── claims.json            # 55 synthetic test claims
├── docs/                      # Empty (pending)
├── tests/                     # Empty (pending)
├── presentation/              # Empty (pending)
└── outputs/                   # Empty (pending)
```

---

## Current Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Backend with realistic triage logic | COMPLETE |
| Phase 2 | Frontend with claim submission | COMPLETE |
| Phase 3A | SQLite database + Dashboard metrics | COMPLETE |
| Phase 3B | Batch CSV upload | COMPLETE |
| Phase 3C | Queue View component | COMPLETE |
| Phase 3D | Claim Detail Modal | COMPLETE |

### Pending Work
- Git commit for Phase 3 progress
- Documentation (architecture diagram, strategic scoping)
- PowerPoint presentation for Tenex
- Demo video (5-10 min)
- UI polish pass (submit form is functional but clunky)
- Optional: Deployment (Railway + Vercel)

---

## Triage Logic

AI routes claims to 3 queues. It does NOT make final approve/deny decisions.

### Escalation Queue (Red) — checked first, ANY trigger escalates

| Trigger | Criteria |
|---------|----------|
| Fraud signals detected | Any of the 4 fraud checks (see below) |
| Exceeds coverage | `damage_amount_estimate > policy_coverage_limit` |
| High-dollar claim | `damage_amount_estimate > $15,000` |
| At-fault + high damage | `fault = policyholder AND damage > $7,500` |

- Routes to: Senior Claims Adjuster (or SIU if fraud detected)
- Review time: 3-10 business days (5-10 if fraud)
- Confidence: 0.82-0.95

### Fast-Track Queue (Green) — ALL criteria must be true

| Criteria | Threshold |
|----------|-----------|
| Low damage | `damage_amount_estimate < $5,000` |
| Not at fault | `fault_determination` in [other_party, shared] |
| Police report | `police_report_filed == true` |
| Clean history | `prior_claims_count <= 1` |
| No fraud | Zero fraud signals detected |

- Routes to: Junior Claims Adjuster
- Review time: 1-2 business days
- Estimated payout: `damage - deductible` (pending verification)
- Confidence: 0.90-0.97

### Standard Review Queue (Yellow) — everything else

- Routes to: Standard Claims Adjuster
- Review time: 2-4 business days
- Estimated payout: TBD pending investigation
- Confidence: 0.70-0.85
- Reasoning explains which fast-track criteria failed

### Fraud Signal Detection

| Signal | Criteria |
|--------|----------|
| Inconsistent damage | `airbags_deployed == true AND vehicle_drivable == true` |
| High-value + high-mileage | `vehicle_mileage > 150,000 AND damage > $8,000` |
| No police report on high-value | `police_report_filed == false AND damage > $7,500` |
| Excessive claims history | `prior_claims_count > 3` |

### AI Reasoning

All reasoning is deterministic — template strings that cite exact field values and thresholds from the input data. Zero hallucination risk. No LLM generates the reasoning.

Examples:
- **Fast-track:** "Damage $3,200.00 < $5,000 threshold. Fault: other party. Police report: filed. Prior claims: 0 (threshold: 1). No fraud signals detected."
- **Standard:** "Did not meet fast-track criteria. Failed: fault: policyholder (requires other party or shared). Failed: no police report filed. No escalation triggers found."
- **Escalation:** "1 fraud signal(s) detected: No police report on high-value claim (>$7,500). Policyholder at fault with significant damage ($8,900.00)."

---

## API Endpoints

Base URL: `http://127.0.0.1:8000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/process` | Triage single claim (ClaimInput → AIResponse), saves to DB |
| POST | `/process_batch` | Upload CSV, process all rows, return summary + errors |
| GET | `/dashboard/metrics` | Total processed, time/cost saved, queue distribution, avg speed |
| GET | `/queue/{queue_type}` | Claims filtered by queue (fast_track, standard_review, escalation) |
| GET | `/claims` | All claims from data/claims.json |
| GET | `/claims/{claim_id}` | Single claim by ID |
| GET | `/responses` | All responses from data/responses.json |
| GET | `/responses/{claim_id}` | Single response by claim ID |

### Startup Behavior
- `init_db()` runs on app startup
- Creates `processed_claims` table if not exists
- Pre-loads 55 claims from `data/claims.json` if database is empty

### CORS
- All origins allowed (development mode)

---

## Database Schema

**File:** `backend/claims.db` (SQLite, auto-generated)

### Table: processed_claims

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| claim_id | TEXT | UNIQUE |
| decision | TEXT | fast_track, standard_review, escalation |
| queue | TEXT | "Fast-Track Queue", "Standard Review Queue", "Escalation Queue" |
| recommended_adjuster | TEXT | |
| estimated_review_time | TEXT | |
| estimated_payout_range | TEXT | Nullable |
| confidence_score | REAL | |
| processing_time_seconds | REAL | |
| reasoning | TEXT | Deterministic, data-cited |
| fraud_signals | TEXT | JSON serialized array |
| policy_verification | TEXT | |
| damage_assessment | TEXT | |
| next_steps | TEXT | JSON serialized array |
| escalation_reason | TEXT | Nullable |
| timestamp | TEXT | ISO datetime |
| claim_data | TEXT | JSON serialized full ClaimInput (all 22 fields) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

## Data Models

### ClaimInput (22 fields)

| Field | Type |
|-------|------|
| claim_id | str |
| submission_date | date |
| policy_number | str |
| policyholder_name | str |
| vehicle_year | int |
| vehicle_make | str |
| vehicle_model | str |
| vehicle_vin | str |
| vehicle_mileage | int |
| date_of_incident | date |
| time_of_incident | str |
| location_address | str |
| collision_type | CollisionType enum |
| damage_description | str |
| damage_amount_estimate | float |
| fault_determination | FaultDetermination enum |
| police_report_filed | bool |
| policy_coverage_limit | float |
| deductible | float |
| prior_claims_count | int |
| vehicle_drivable | bool |
| airbags_deployed | bool |

### AIResponse (15 fields)

| Field | Type |
|-------|------|
| claim_id | str |
| decision | Decision enum (fast_track, standard_review, escalation) |
| queue | str |
| recommended_adjuster | str |
| estimated_review_time | str |
| estimated_payout_range | Optional[str] |
| confidence_score | float |
| processing_time_seconds | float |
| reasoning | str |
| fraud_signals | list[str] |
| policy_verification | str |
| damage_assessment | str |
| next_steps | list[str] |
| escalation_reason | Optional[str] |
| timestamp | datetime |

### Enums

**CollisionType:** rear_end, head_on, side_impact, rollover, single_vehicle, multi_vehicle, sideswipe, hit_and_run, intersection

**FaultDetermination:** policyholder, other_party, shared, undetermined

**Decision:** fast_track, standard_review, escalation

---

## Frontend Components

### App.jsx
Main shell with header and 4 sections:
1. Submit Claim → ClaimUpload
2. Batch Upload → BatchUpload
3. Analytics Dashboard → Dashboard
4. Claims Queues → QueueView

### ClaimUpload.jsx
Full 22-field claim submission form organized into 4 numbered sections:
1. Policyholder & Policy (claim ID, name, policy #, submission date)
2. Vehicle Information (year, make, model, mileage, VIN, drivable, airbags)
3. Incident Details (date, time, collision type, fault, address, damage description, police report)
4. Coverage & Financials (damage estimate, coverage limit, deductible, prior claims)

All fields required with placeholder examples. No defaults. POSTs to `/process`. Displays triage result inline with color-coded decision banner, routing details, reasoning, fraud signals, and next steps.

### BatchUpload.jsx
CSV file upload component. POSTs to `/process_batch` using FormData. Shows file picker, loading spinner during processing, then results: summary card (total/processed/skipped), queue distribution badges, collapsible error details, and "Upload Another Batch" reset.

### Dashboard.jsx
Fetches `/dashboard/metrics` on mount. Displays 5 metric cards:
- Total Claims Processed (hero card, blue, full-width)
- Time Saved (hours)
- Cost Savings (dollars)
- Processing Speed (avg seconds)
- Queue Distribution (color-coded badges, full-width)

### QueueView.jsx
Tabbed queue selector (3 tabs with counts). Fetches `/queue/{queue_type}` on tab change. Displays claims in sortable table with columns: Claim ID, Queue, Estimated Payout, Confidence %, Timestamp, Fraud Signals count. Clicking a row opens ClaimDetailModal. Sort toggle: Newest/Oldest first.

### ClaimDetailModal.jsx
Full-screen overlay modal opened from QueueView. Layout optimized for adjuster workflow — decision context first, reference data second:

1. Header (claim ID, decision badge, timestamp)
2. AI Triage Decision (queue, adjuster, review time, confidence)
3. AI Reasoning (data-cited explanation)
4. Fraud Signals (red badges, if any)
5. Estimated Payout
6. Escalation Reason (yellow box, if escalated)
7. Summary line ("Sarah Mitchell | POL-449283 | 2019 Honda Accord")
8. Decision Factors table (damage, fault, police report, prior claims, coverage, deductible, drivable, airbags)
9. Full Claim Details (collapsible — VIN, mileage, collision type, dates, location, damage description, policy verification, damage assessment)
10. Recommended Next Steps (numbered list)
11. Role-based Action Buttons (mock — alerts on click)

**Role-based actions by queue:**
- Junior (fast-track): Approve, Request Info, Escalate to Senior
- Standard: Approve, Deny, Request Info, Escalate to Senior
- Senior/SIU (escalation): Approve, Deny, Flag for Fraud Investigation, Request Info, Escalate to Manager

---

## Critical Constraints

These rules have been followed throughout the entire build:

1. **Single file components** — no separate CSS files
2. **Tailwind utility classes ONLY** — no custom CSS, no style tags
3. **Do NOT invent functions** — only use real React/Python/library syntax
4. **No unauthorized dependencies** — every library explicitly approved
5. **If unsure, STOP and ask** — never guess at syntax
6. **Keep existing functionality** — new features don't break old ones
7. **Use exact field names** — match backend response keys precisely
8. **STOP after each phase** — verify before continuing
9. **Deterministic reasoning only** — no LLM-generated text, zero hallucination risk
10. **AI assists, doesn't decide** — triage routing, not approve/deny

---

## ROI Story (For Tenex Presentation)

**Problem:** Claims adjusters spend ~15 minutes per claim on manual intake triage and routing. Misrouted claims create reassignment delays and bottlenecks.

**Solution:** AI triages claims in ~1.2 seconds with data-cited reasoning, routing to the correct adjuster queue automatically.

**Impact for a mid-size insurer (10,000 claims/month):**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Triage time per claim | 15 minutes | ~1.2 seconds | 99% reduction |
| Monthly triage hours | 2,500 hours | ~3.3 hours | 2,497 hours freed |
| Annual cost savings | — | ~$1.48M | At $50/hour adjuster cost |
| Adjuster productivity | Baseline | +30% | Time freed for investigation |
| Routing accuracy | ~70% | ~95% | Fewer reassignments |

**Scope:** Focused on collision claims — the highest-volume, lowest-risk claim type (~60% of total volume).

---

## Design Decisions

**Why realistic triage instead of approve/deny?**
Insurers will never let AI make final payment decisions. AI-assisted triage is actually deployable in enterprise. This demonstrates understanding of how insurance actually works.

**Why SQLite?**
Fast prototyping, zero external dependencies, data persists across restarts. Would migrate to PostgreSQL in production.

**Why deterministic reasoning (not LLM)?**
Eliminates hallucination risk entirely. Every word in the reasoning traces back to an input field value. Critical for regulated industries. If Claude were added later, it would need input-only prompts, citation validation, and audit logging.

**Why mock action buttons?**
Demonstrates full workflow understanding without overbuilding. Payment integration, email notifications, and adjuster assignment are Phase 5+ concerns.

**Why no authentication?**
Demo focuses on product value, not security infrastructure. Production would add role-based auth (Supabase, Auth0, or similar).

**Why CommonJS for Tailwind/PostCSS configs?**
`package.json` has `"type": "module"` for the app code, but Tailwind 3.3.0 and PostCSS have compatibility issues with ESM configs. Renaming to `.cjs` isolates the two configs that need CommonJS.

---

## Future Roadmap

### Phase 4: Workflow Tracking
- `claim_workflow` table tracking step-by-step progress per claim
- Visual progress bar (pending → in_progress → completed)
- Stale claim detection (stuck >5 days)
- Role-based step permissions (junior can only update fast-track steps)
- Audit trail (who completed each step, when)

### Phase 5: Integration
- Payment system integration
- Email/SMS notifications
- Document management (photo upload, OCR)
- Integration with existing claims management systems

### Phase 6: Expansion
- All claim types (property damage, injury, subrogation)
- Mobile app for field adjusters
- Advanced fraud detection with ML
- LLM-powered reasoning (with citation validation and audit logging)

---

## Running the Application

**Backend:**
```bash
cd "C:\Users\Michael Gardner\Desktop\Tenex - Insurance Claims Project"
uvicorn backend.app:app --reload
```
Runs on http://127.0.0.1:8000 — Swagger docs at http://127.0.0.1:8000/docs

**Frontend:**
```bash
cd "C:\Users\Michael Gardner\Desktop\Tenex - Insurance Claims Project\frontend"
npm install
npm run dev
```
Runs on http://localhost:5173

**Database:**
- Auto-created on first backend startup at `backend/claims.db`
- Pre-loads 55 claims from `data/claims.json` if empty
- Delete `claims.db` and restart to reset

---

## Test Data

`data/claims.json` contains 55 synthetic claims covering all triage paths:
- Fast-track eligible (low damage, other party fault, police report, clean history)
- Standard review (moderate damage, missing documentation, at-fault)
- Escalation triggers (high dollar, fraud signals, excessive claims, coverage exceeded)
- All 9 collision types represented
- Vehicle mileage range: 22,000 to 165,000
- Damage range: $1,200 to $16,000+
- Prior claims: 0 to 4+

Pre-loaded distribution: ~20 fast-track, ~26 standard review, ~9 escalation.
