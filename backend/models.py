from pydantic import BaseModel, Field
from enum import Enum
from datetime import date, datetime
from typing import Optional


class CollisionType(str, Enum):
    REAR_END = "rear_end"
    HEAD_ON = "head_on"
    SIDE_IMPACT = "side_impact"
    ROLLOVER = "rollover"
    SINGLE_VEHICLE = "single_vehicle"
    MULTI_VEHICLE = "multi_vehicle"


class FaultDetermination(str, Enum):
    POLICYHOLDER = "policyholder"
    OTHER_PARTY = "other_party"
    SHARED = "shared"
    UNDETERMINED = "undetermined"


class Decision(str, Enum):
    FAST_TRACK = "fast_track"
    STANDARD_REVIEW = "standard_review"
    ESCALATION = "escalation"


class ClaimInput(BaseModel):
    claim_id: str
    submission_date: date
    policy_number: str
    policyholder_name: str
    vehicle_year: int
    vehicle_make: str
    vehicle_model: str
    vehicle_vin: str
    vehicle_mileage: int
    date_of_incident: date
    time_of_incident: str
    location_address: str
    collision_type: CollisionType
    damage_description: str
    damage_amount_estimate: float
    fault_determination: FaultDetermination
    police_report_filed: bool
    policy_coverage_limit: float
    deductible: float
    prior_claims_count: int
    vehicle_drivable: bool
    airbags_deployed: bool


class AIResponse(BaseModel):
    claim_id: str
    decision: Decision
    queue: str
    recommended_adjuster: str
    estimated_review_time: str
    estimated_payout_range: Optional[str] = None
    confidence_score: float
    processing_time_seconds: float
    reasoning: str
    fraud_signals: list[str]
    policy_verification: str
    damage_assessment: str
    next_steps: list[str]
    escalation_reason: Optional[str] = None
    timestamp: datetime
