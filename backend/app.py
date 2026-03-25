import io
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from backend.models import ClaimInput, AIResponse
from backend.database import load_claims, load_responses, get_claim_by_id, get_response_by_claim_id
from backend.processor import process_claim
from backend.db import init_db, save_processed_claim, get_dashboard_metrics, get_processed_claims_by_queue, assign_to_least_busy, get_adjuster_workload, update_claim_status, escalate_claim, get_adjuster_personal_metrics, deny_claim

app = FastAPI(title="Tenex Insurance Claims Triage API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


@app.post("/process")
def process(claim: ClaimInput):
    response = process_claim(claim)
    assigned_to = assign_to_least_busy(response.queue)
    save_processed_claim(response, claim, assigned_to=assigned_to)
    result = response.model_dump()
    result["assigned_to"] = assigned_to
    return result


@app.post("/process_batch")
async def process_batch(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))

    errors = []
    results = []
    summary = {"fast_track": 0, "standard_review": 0, "escalation": 0}

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-based + header row
        row_dict = row.where(pd.notna(row), None).to_dict()
        claim_id = row_dict.get("claim_id", f"row_{row_num}")

        try:
            claim = ClaimInput(**row_dict)
        except Exception as e:
            errors.append({"row": row_num, "claim_id": str(claim_id), "error": str(e)})
            continue

        response = process_claim(claim)
        assigned_to = assign_to_least_busy(response.queue)
        save_processed_claim(response, claim, assigned_to=assigned_to)
        results.append(response)
        summary[response.decision.value] += 1

    return {
        "total_uploaded": len(df),
        "processed": len(results),
        "skipped": len(errors),
        "errors": errors,
        "summary": summary,
        "results": results,
    }


@app.get("/dashboard/metrics")
def dashboard_metrics(adjuster_name: str = None):
    metrics = get_dashboard_metrics()
    if adjuster_name and adjuster_name != "Admin":
        metrics["personal_metrics"] = get_adjuster_personal_metrics(adjuster_name)
    return metrics


@app.get("/queue/{queue_type}")
def get_queue(queue_type: str):
    queue_map = {
        "fast_track": "Fast-Track Queue",
        "standard_review": "Standard Review Queue",
        "escalation": "Senior Review Queue",
    }
    queue_name = queue_map.get(queue_type)
    if not queue_name:
        raise HTTPException(status_code=404, detail=f"Invalid queue type: {queue_type}. Use: fast_track, standard_review, or escalation")
    return get_processed_claims_by_queue(queue_name)


@app.put("/claims/{claim_id}/status")
def update_status(claim_id: str, status: str):
    valid_statuses = ["In Review", "Approved", "Denied", "Escalated"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    return update_claim_status(claim_id, status)


@app.put("/claims/{claim_id}/deny")
def deny_claim_endpoint(claim_id: str, denial_code: str, denial_notes: str, denied_by: str):
    valid_codes = [
        "Coverage Exclusion", "Fraud Suspected", "Insufficient Documentation",
        "Duplicate Claim", "Policy Not Active", "Claim Amount Exceeds Policy Limit",
        "Pre-Existing Damage", "Other",
    ]
    if denial_code not in valid_codes:
        raise HTTPException(status_code=400, detail=f"Invalid denial code. Must be one of: {valid_codes}")
    return deny_claim(claim_id, denial_code, denial_notes, denied_by)


@app.put("/claims/{claim_id}/escalate")
def escalate_claim_endpoint(claim_id: str, escalated_from: str, escalated_to_queue: str, escalation_notes: str):
    valid_queues = ["Fast-Track Queue", "Standard Review Queue", "Senior Review Queue"]
    if escalated_to_queue not in valid_queues:
        raise HTTPException(status_code=400, detail=f"Invalid target queue. Must be one of: {valid_queues}")
    return escalate_claim(claim_id, escalated_from, escalated_to_queue, escalation_notes)


@app.get("/workload/{queue_type}")
def get_workload(queue_type: str):
    queue_map = {
        "fast_track": "Fast-Track Queue",
        "standard_review": "Standard Review Queue",
        "escalation": "Senior Review Queue",
    }
    queue_name = queue_map.get(queue_type)
    if not queue_name:
        raise HTTPException(status_code=400, detail="Invalid queue type")
    workload = get_adjuster_workload(queue_name)
    return {"queue": queue_name, "workload": workload}


@app.get("/claims", response_model=list[ClaimInput])
def get_claims():
    return load_claims()


@app.get("/claims/{claim_id}", response_model=ClaimInput)
def get_claim(claim_id: str):
    claim = get_claim_by_id(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found")
    return claim


@app.get("/responses", response_model=list[AIResponse])
def get_responses():
    return load_responses()


@app.get("/responses/{claim_id}", response_model=AIResponse)
def get_response(claim_id: str):
    response = get_response_by_claim_id(claim_id)
    if not response:
        raise HTTPException(status_code=404, detail=f"Response for claim {claim_id} not found")
    return response
