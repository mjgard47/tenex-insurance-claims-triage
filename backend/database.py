import json
from pathlib import Path
from backend.models import ClaimInput, AIResponse

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CLAIMS_FILE = DATA_DIR / "claims.json"
RESPONSES_FILE = DATA_DIR / "responses.json"


def load_claims() -> list[ClaimInput]:
    if not CLAIMS_FILE.exists():
        return []
    with open(CLAIMS_FILE, "r") as f:
        data = json.load(f)
    return [ClaimInput(**claim) for claim in data]


def load_responses() -> list[AIResponse]:
    if not RESPONSES_FILE.exists():
        return []
    with open(RESPONSES_FILE, "r") as f:
        data = json.load(f)
    return [AIResponse(**response) for response in data]


def get_claim_by_id(claim_id: str) -> ClaimInput | None:
    claims = load_claims()
    for claim in claims:
        if claim.claim_id == claim_id:
            return claim
    return None


def get_response_by_claim_id(claim_id: str) -> AIResponse | None:
    responses = load_responses()
    for response in responses:
        if response.claim_id == claim_id:
            return response
    return None
