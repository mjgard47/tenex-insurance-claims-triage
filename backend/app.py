import io
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from backend.models import ClaimInput, AIResponse
from backend.database import load_claims, load_responses, get_claim_by_id, get_response_by_claim_id
from backend.processor import process_claim
from backend.db import init_db, save_processed_claim, get_dashboard_metrics, get_processed_claims_by_queue

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


@app.post("/process", response_model=AIResponse)
def process(claim: ClaimInput):
    response = process_claim(claim)
    save_processed_claim(response, claim)
    return response


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
        save_processed_claim(response, claim)
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
def dashboard_metrics():
    return get_dashboard_metrics()


@app.get("/queue/{queue_type}")
def get_queue(queue_type: str):
    queue_map = {
        "fast_track": "Fast-Track Queue",
        "standard_review": "Standard Review Queue",
        "escalation": "Escalation Queue",
    }
    queue_name = queue_map.get(queue_type)
    if not queue_name:
        raise HTTPException(status_code=404, detail=f"Invalid queue type: {queue_type}. Use: fast_track, standard_review, or escalation")
    return get_processed_claims_by_queue(queue_name)


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
