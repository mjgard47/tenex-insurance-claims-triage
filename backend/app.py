from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.models import ClaimInput, AIResponse
from backend.database import load_claims, load_responses, get_claim_by_id, get_response_by_claim_id
from backend.processor import process_claim

app = FastAPI(title="Tenex Insurance Claims Triage API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/process", response_model=AIResponse)
def process(claim: ClaimInput):
    return process_claim(claim)


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
