import json
import sqlite3
from datetime import datetime
from pathlib import Path
from backend.models import AIResponse, ClaimInput
from backend.processor import process_claim

ADJUSTER_ROSTER = {
    "Fast-Track Queue": ["Junior Adjuster 1", "Junior Adjuster 2"],
    "Standard Review Queue": ["Standard Adjuster 1", "Standard Adjuster 2"],
    "Senior Review Queue": ["Senior Adjuster 1", "Senior Adjuster 2"],
}

DB_PATH = Path(__file__).resolve().parent / "claims.db"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def get_db_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS processed_claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            claim_id TEXT UNIQUE,
            decision TEXT,
            queue TEXT,
            recommended_adjuster TEXT,
            estimated_review_time TEXT,
            estimated_payout_range TEXT,
            confidence_score REAL,
            processing_time_seconds REAL,
            reasoning TEXT,
            fraud_signals TEXT,
            policy_verification TEXT,
            damage_assessment TEXT,
            next_steps TEXT,
            escalation_reason TEXT,
            criteria_checks TEXT,
            payout_calculation TEXT,
            timestamp TEXT,
            claim_data TEXT,
            assigned_to TEXT,
            assigned_at TEXT,
            status TEXT DEFAULT 'Assigned',
            status_updated_at TEXT,
            escalated_from TEXT,
            escalated_to_queue TEXT,
            escalation_notes TEXT,
            escalation_timestamp TEXT,
            denial_code TEXT,
            denial_notes TEXT,
            denial_timestamp TEXT,
            denied_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            claim_id TEXT,
            old_status TEXT,
            new_status TEXT,
            changed_by TEXT,
            changed_at TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()

    # Pre-load claims if database is empty
    cursor = conn.execute("SELECT COUNT(*) FROM processed_claims")
    count = cursor.fetchone()[0]
    if count == 0:
        _preload_claims(conn)

    conn.close()


def _preload_claims(conn):
    claims_file = DATA_DIR / "claims.json"
    if not claims_file.exists():
        return
    with open(claims_file, "r") as f:
        claims_data = json.load(f)
    for claim_data in claims_data:
        claim = ClaimInput(**claim_data)
        response = process_claim(claim)
        assigned_to = _assign_least_busy(conn, response.queue)
        _insert_response(conn, response, claim, assigned_to)
    conn.commit()


def save_processed_claim(response: AIResponse, claim: ClaimInput = None, assigned_to: str = None):
    conn = get_db_connection()
    _insert_response(conn, response, claim, assigned_to)
    conn.commit()
    conn.close()


def _insert_response(conn, response: AIResponse, claim: ClaimInput = None, assigned_to: str = None):
    claim_data = None
    if claim:
        claim_data = json.dumps(claim.model_dump(), default=str)
    assigned_at = datetime.now().isoformat() if assigned_to else None
    conn.execute(
        """
        INSERT OR REPLACE INTO processed_claims (
            claim_id, decision, queue, recommended_adjuster,
            estimated_review_time, estimated_payout_range,
            confidence_score, processing_time_seconds,
            reasoning, fraud_signals, policy_verification,
            damage_assessment, next_steps, escalation_reason,
            criteria_checks, payout_calculation,
            timestamp, claim_data, assigned_to, assigned_at,
            status, status_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            response.claim_id,
            response.decision.value,
            response.queue,
            response.recommended_adjuster,
            response.estimated_review_time,
            response.estimated_payout_range,
            response.confidence_score,
            response.processing_time_seconds,
            response.reasoning,
            json.dumps(response.fraud_signals),
            response.policy_verification,
            response.damage_assessment,
            json.dumps(response.next_steps),
            response.escalation_reason,
            json.dumps([c.model_dump() for c in response.criteria_checks]),
            json.dumps(response.payout_calculation.model_dump() if response.payout_calculation else None),
            response.timestamp.isoformat(),
            claim_data,
            assigned_to,
            assigned_at,
            "Assigned" if assigned_to else "Triaged",
            datetime.now().isoformat(),
        ),
    )


def get_all_processed_claims() -> list[dict]:
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM processed_claims ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [_row_to_dict(row) for row in rows]


def get_processed_claims_by_queue(queue_type: str) -> list[dict]:
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM processed_claims WHERE queue = ? ORDER BY created_at DESC",
        (queue_type,),
    ).fetchall()
    conn.close()
    return [_row_to_dict(row) for row in rows]


def get_triage_only_roi(total: int) -> dict:
    """Conservative ROI: 15 min saved per claim (triage decision only)."""
    time_saved = round(total * 0.25, 1)
    cost_saved = round(time_saved * 50, 0)
    annual = round(0.25 * 50 * 10000 * 12, 0) if total > 0 else 0
    return {
        "time_saved_hours": time_saved,
        "cost_saved_monthly": cost_saved,
        "annual_savings": annual,
        "assumptions": {"minutes_per_claim": 15, "hourly_rate": 50, "claims_per_month_at_scale": 10000},
    }


def get_full_integration_roi(total: int) -> dict:
    """Aggressive ROI: 2 hours saved per claim (full intake workflow)."""
    time_saved = round(total * 2.0, 1)
    cost_saved = round(time_saved * 50, 0)
    annual = round(2.0 * 50 * 10000 * 12, 0) if total > 0 else 0
    return {
        "time_saved_hours": time_saved,
        "cost_saved_monthly": cost_saved,
        "annual_savings": annual,
        "assumptions": {"hours_per_claim": 2, "hourly_rate": 50, "claims_per_month_at_scale": 10000},
    }


def get_dashboard_metrics() -> dict:
    conn = get_db_connection()

    total = conn.execute("SELECT COUNT(*) FROM processed_claims").fetchone()[0]

    avg_time = conn.execute(
        "SELECT AVG(processing_time_seconds) FROM processed_claims"
    ).fetchone()[0] or 0.0

    queue_rows = conn.execute(
        "SELECT queue, COUNT(*) as count FROM processed_claims GROUP BY queue"
    ).fetchall()
    queue_distribution = {row["queue"]: row["count"] for row in queue_rows}

    # Each claim saves ~2 hours of manual intake triage
    time_saved_hours = round(total * 2.0, 1)
    # Average adjuster cost ~$35/hour, so 2 hours saved = $70 per claim
    cost_saved_dollars = round(total * 70.0, 2)

    # Status breakdown
    status_rows = conn.execute(
        "SELECT COALESCE(status, 'Assigned') as s, COUNT(*) as c FROM processed_claims GROUP BY s"
    ).fetchall()
    status_breakdown = {row["s"]: row["c"] for row in status_rows}

    # Avg time to decision
    decision_rows = conn.execute(
        "SELECT queue, assigned_at, status_updated_at FROM processed_claims WHERE status IN ('Approved','Denied') AND assigned_at IS NOT NULL AND status_updated_at IS NOT NULL"
    ).fetchall()
    all_times = []
    queue_times = {}
    for row in decision_rows:
        try:
            diff = (datetime.fromisoformat(row["status_updated_at"]) - datetime.fromisoformat(row["assigned_at"])).total_seconds() / 86400
            all_times.append(diff)
            queue_times.setdefault(row["queue"], []).append(diff)
        except (ValueError, TypeError):
            pass
    avg_time_to_decision = {
        "overall": round(sum(all_times) / len(all_times), 2) if all_times else 0,
        "by_queue": {q: round(sum(t) / len(t), 2) for q, t in queue_times.items()},
    }

    # Escalation rate
    escalated = conn.execute("SELECT COUNT(*) FROM processed_claims WHERE status = 'Escalated'").fetchone()[0]
    escalation_rate = {"rate": round(escalated / total * 100, 1) if total > 0 else 0, "escalated_count": escalated, "total_count": total}

    # Fast-track success
    ft_total = conn.execute("SELECT COUNT(*) FROM processed_claims WHERE decision = 'fast_track'").fetchone()[0]
    ft_approved = conn.execute("SELECT COUNT(*) FROM processed_claims WHERE decision = 'fast_track' AND status = 'Approved'").fetchone()[0]
    fast_track_success = {"rate": round(ft_approved / ft_total * 100, 1) if ft_total > 0 else 0, "approved": ft_approved, "total": ft_total}

    # Projected annual savings (10K claims/month)
    savings_per_claim = cost_saved_dollars / total if total > 0 else 0
    projected_annual = round(savings_per_claim * 10000 * 12, 0)

    conn.close()

    return {
        "total_processed": total,
        "time_saved_hours": time_saved_hours,
        "cost_saved_dollars": cost_saved_dollars,
        "queue_distribution": queue_distribution,
        "avg_processing_time": round(avg_time, 2),
        "status_breakdown": status_breakdown,
        "avg_time_to_decision": avg_time_to_decision,
        "escalation_rate": escalation_rate,
        "fast_track_success_rate": fast_track_success,
        "projected_annual_savings": projected_annual,
        "triage_only_roi": get_triage_only_roi(total),
        "full_integration_roi": get_full_integration_roi(total),
    }


def get_adjuster_personal_metrics(adjuster_name: str) -> dict:
    """Returns personal performance metrics for a specific adjuster."""
    conn = get_db_connection()

    pending = conn.execute(
        "SELECT COUNT(*) FROM processed_claims WHERE assigned_to = ? AND status NOT IN ('Approved','Denied')",
        (adjuster_name,),
    ).fetchone()[0]

    # Avg decision time
    rows = conn.execute(
        "SELECT assigned_at, status_updated_at FROM processed_claims WHERE assigned_to = ? AND status IN ('Approved','Denied') AND assigned_at IS NOT NULL AND status_updated_at IS NOT NULL",
        (adjuster_name,),
    ).fetchall()
    times = []
    for row in rows:
        try:
            diff = (datetime.fromisoformat(row["status_updated_at"]) - datetime.fromisoformat(row["assigned_at"])).total_seconds() / 86400
            times.append(diff)
        except (ValueError, TypeError):
            pass
    avg_decision_time = round(sum(times) / len(times), 2) if times else 0

    total_handled = conn.execute(
        "SELECT COUNT(*) FROM processed_claims WHERE assigned_to = ? AND status IN ('Approved','Denied')",
        (adjuster_name,),
    ).fetchone()[0]

    approved = conn.execute(
        "SELECT COUNT(*) FROM processed_claims WHERE assigned_to = ? AND status = 'Approved'",
        (adjuster_name,),
    ).fetchone()[0]

    approval_rate = round(approved / total_handled * 100, 1) if total_handled > 0 else 0

    escalated = conn.execute(
        "SELECT COUNT(*) FROM processed_claims WHERE escalated_from = ?",
        (adjuster_name,),
    ).fetchone()[0]

    total_assigned = conn.execute(
        "SELECT COUNT(*) FROM processed_claims WHERE assigned_to = ?",
        (adjuster_name,),
    ).fetchone()[0]

    esc_rate = round(escalated / total_assigned * 100, 1) if total_assigned > 0 else 0

    # Avg pickup time: Assigned → In Review (from audit_log)
    pickup_rows = conn.execute(
        """
        SELECT a.changed_at, p.assigned_at
        FROM audit_log a
        JOIN processed_claims p ON a.claim_id = p.claim_id
        WHERE a.changed_by = ? AND a.new_status = 'In Review' AND a.old_status = 'Assigned'
        AND p.assigned_at IS NOT NULL
        """,
        (adjuster_name,),
    ).fetchall()
    pickup_times = []
    for row in pickup_rows:
        try:
            diff = (datetime.fromisoformat(row["changed_at"]) - datetime.fromisoformat(row["assigned_at"])).total_seconds()
            pickup_times.append(diff)
        except (ValueError, TypeError):
            pass
    avg_pickup_seconds = round(sum(pickup_times) / len(pickup_times), 0) if pickup_times else 0

    # Avg review time: In Review → Approved/Denied (from audit_log)
    review_rows = conn.execute(
        """
        SELECT a.changed_at as decided_at, a2.changed_at as reviewed_at
        FROM audit_log a
        JOIN audit_log a2 ON a.claim_id = a2.claim_id
        WHERE a.changed_by = ? AND a.new_status IN ('Approved', 'Denied')
        AND a2.new_status = 'In Review'
        AND a2.changed_by = ?
        """,
        (adjuster_name, adjuster_name),
    ).fetchall()
    review_times = []
    for row in review_rows:
        try:
            diff = (datetime.fromisoformat(row["decided_at"]) - datetime.fromisoformat(row["reviewed_at"])).total_seconds()
            if diff >= 0:
                review_times.append(diff)
        except (ValueError, TypeError):
            pass
    avg_review_seconds = round(sum(review_times) / len(review_times), 0) if review_times else 0

    conn.close()
    return {
        "pending_claims": pending,
        "avg_decision_time": avg_decision_time,
        "approval_rate": approval_rate,
        "escalation_rate": esc_rate,
        "total_handled": total_handled,
        "avg_pickup_seconds": avg_pickup_seconds,
        "avg_review_seconds": avg_review_seconds,
    }


def update_claim_status(claim_id: str, new_status: str) -> dict:
    """Updates claim status, writes audit log row."""
    conn = get_db_connection()
    changed_at = datetime.now().isoformat()

    # Get current status and assigned_to for audit
    row = conn.execute(
        "SELECT status, assigned_to FROM processed_claims WHERE claim_id = ?",
        (claim_id,),
    ).fetchone()
    old_status = row["status"] if row else None
    changed_by = row["assigned_to"] if row else None

    # Update status
    conn.execute(
        "UPDATE processed_claims SET status = ?, status_updated_at = ? WHERE claim_id = ?",
        (new_status, changed_at, claim_id),
    )

    # Write audit log
    conn.execute(
        "INSERT INTO audit_log (claim_id, old_status, new_status, changed_by, changed_at) VALUES (?, ?, ?, ?, ?)",
        (claim_id, old_status, new_status, changed_by, changed_at),
    )

    conn.commit()
    conn.close()
    return {"claim_id": claim_id, "status": new_status, "updated_at": changed_at}


def escalate_claim(claim_id: str, escalated_from: str, escalated_to_queue: str, escalation_notes: str) -> dict:
    """Escalates a claim to a higher-level queue with notes and re-assigns."""
    conn = get_db_connection()
    now = datetime.now().isoformat()

    # Get old status for audit
    row = conn.execute(
        "SELECT status, assigned_to FROM processed_claims WHERE claim_id = ?",
        (claim_id,),
    ).fetchone()
    old_status = row["status"] if row else None

    # Assign to least busy adjuster in target queue
    adjusters = ADJUSTER_ROSTER.get(escalated_to_queue, [])
    new_assigned_to = None
    if adjusters:
        workload = {}
        for adj in adjusters:
            cursor = conn.execute(
                "SELECT COUNT(*) FROM processed_claims WHERE assigned_to = ? AND queue = ? AND status NOT IN ('Approved', 'Denied')",
                (adj, escalated_to_queue),
            )
            workload[adj] = cursor.fetchone()[0]
        new_assigned_to = min(workload, key=workload.get)

    conn.execute(
        """
        UPDATE processed_claims SET
            queue = ?, assigned_to = ?, assigned_at = ?,
            status = 'Escalated', status_updated_at = ?,
            escalated_from = ?, escalated_to_queue = ?,
            escalation_notes = ?, escalation_timestamp = ?
        WHERE claim_id = ?
        """,
        (
            escalated_to_queue, new_assigned_to, now,
            now,
            escalated_from, escalated_to_queue,
            escalation_notes, now,
            claim_id,
        ),
    )

    # Audit log
    conn.execute(
        "INSERT INTO audit_log (claim_id, old_status, new_status, changed_by, changed_at) VALUES (?, ?, ?, ?, ?)",
        (claim_id, old_status, "Escalated", escalated_from, now),
    )

    conn.commit()
    conn.close()
    return {
        "claim_id": claim_id,
        "escalated_from": escalated_from,
        "escalated_to_queue": escalated_to_queue,
        "assigned_to": new_assigned_to,
        "escalation_notes": escalation_notes,
        "escalation_timestamp": now,
    }


def deny_claim(claim_id: str, denial_code: str, denial_notes: str, denied_by: str) -> dict:
    """Denies a claim with structured reason code and notes."""
    conn = get_db_connection()
    now = datetime.now().isoformat()

    row = conn.execute(
        "SELECT status, assigned_to FROM processed_claims WHERE claim_id = ?",
        (claim_id,),
    ).fetchone()
    old_status = row["status"] if row else None

    conn.execute(
        """
        UPDATE processed_claims SET
            status = 'Denied', status_updated_at = ?,
            denial_code = ?, denial_notes = ?,
            denial_timestamp = ?, denied_by = ?
        WHERE claim_id = ?
        """,
        (now, denial_code, denial_notes, now, denied_by, claim_id),
    )

    conn.execute(
        "INSERT INTO audit_log (claim_id, old_status, new_status, changed_by, changed_at) VALUES (?, ?, ?, ?, ?)",
        (claim_id, old_status, "Denied", denied_by, now),
    )

    conn.commit()
    conn.close()
    return {
        "claim_id": claim_id,
        "status": "Denied",
        "denial_code": denial_code,
        "denial_notes": denial_notes,
        "denied_by": denied_by,
        "denial_timestamp": now,
    }


def get_adjuster_workload(queue: str) -> dict:
    """Returns dict of adjuster names and their active claim counts for a queue."""
    adjusters = ADJUSTER_ROSTER.get(queue, [])
    if not adjusters:
        return {}
    conn = get_db_connection()
    workload = {}
    for adjuster in adjusters:
        cursor = conn.execute(
            "SELECT COUNT(*) FROM processed_claims WHERE assigned_to = ? AND queue = ? AND status NOT IN ('Approved', 'Denied')",
            (adjuster, queue),
        )
        workload[adjuster] = cursor.fetchone()[0]
    conn.close()
    return workload


def assign_to_least_busy(queue: str) -> str | None:
    """Returns name of adjuster with lowest workload in the queue."""
    workload = get_adjuster_workload(queue)
    if not workload:
        return None
    return min(workload, key=workload.get)


def _assign_least_busy(conn, queue: str) -> str | None:
    """Same as assign_to_least_busy but uses an existing connection (for preload)."""
    adjusters = ADJUSTER_ROSTER.get(queue, [])
    if not adjusters:
        return None
    workload = {}
    for adjuster in adjusters:
        cursor = conn.execute(
            "SELECT COUNT(*) FROM processed_claims WHERE assigned_to = ? AND queue = ?",
            (adjuster, queue),
        )
        workload[adjuster] = cursor.fetchone()[0]
    return min(workload, key=workload.get)


def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["fraud_signals"] = json.loads(d["fraud_signals"])
    d["next_steps"] = json.loads(d["next_steps"])
    if d.get("criteria_checks"):
        d["criteria_checks"] = json.loads(d["criteria_checks"])
    else:
        d["criteria_checks"] = []
    if d.get("payout_calculation"):
        d["payout_calculation"] = json.loads(d["payout_calculation"])
    if d.get("claim_data"):
        d["claim_data"] = json.loads(d["claim_data"])
    return d
