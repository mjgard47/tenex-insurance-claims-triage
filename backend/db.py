import json
import sqlite3
from pathlib import Path
from backend.models import AIResponse, ClaimInput
from backend.processor import process_claim

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
        _insert_response(conn, response, claim)
    conn.commit()


def save_processed_claim(response: AIResponse, claim: ClaimInput = None):
    conn = get_db_connection()
    _insert_response(conn, response, claim)
    conn.commit()
    conn.close()


def _insert_response(conn, response: AIResponse, claim: ClaimInput = None):
    claim_data = None
    if claim:
        claim_data = json.dumps(claim.model_dump(), default=str)
    conn.execute(
        """
        INSERT OR REPLACE INTO processed_claims (
            claim_id, decision, queue, recommended_adjuster,
            estimated_review_time, estimated_payout_range,
            confidence_score, processing_time_seconds,
            reasoning, fraud_signals, policy_verification,
            damage_assessment, next_steps, escalation_reason,
            criteria_checks, payout_calculation,
            timestamp, claim_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

    conn.close()

    # Each claim saves ~2 hours of manual intake triage
    time_saved_hours = round(total * 2.0, 1)
    # Average adjuster cost ~$35/hour, so 2 hours saved = $70 per claim
    cost_saved_dollars = round(total * 70.0, 2)

    return {
        "total_processed": total,
        "time_saved_hours": time_saved_hours,
        "cost_saved_dollars": cost_saved_dollars,
        "queue_distribution": queue_distribution,
        "avg_processing_time": round(avg_time, 2),
    }


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
