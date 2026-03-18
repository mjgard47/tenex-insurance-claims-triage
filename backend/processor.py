import random
from datetime import datetime
from backend.models import ClaimInput, AIResponse, Decision


def process_claim(claim: ClaimInput) -> AIResponse:
    fraud_signals = _detect_fraud_signals(claim)
    triage = _triage(claim, fraud_signals)
    next_steps = _build_next_steps(triage["decision"], claim, fraud_signals)

    return AIResponse(
        claim_id=claim.claim_id,
        decision=triage["decision"],
        queue=triage["queue"],
        recommended_adjuster=triage["recommended_adjuster"],
        estimated_review_time=triage["estimated_review_time"],
        estimated_payout_range=triage["estimated_payout_range"],
        confidence_score=triage["confidence_score"],
        processing_time_seconds=round(random.uniform(0.5, 2.0), 2),
        reasoning=triage["reasoning"],
        fraud_signals=fraud_signals,
        policy_verification=_verify_policy(claim),
        damage_assessment=_assess_damage(claim),
        next_steps=next_steps,
        escalation_reason=triage["escalation_reason"],
        timestamp=datetime.now(),
    )


def _triage(claim: ClaimInput, fraud_signals: list[str]) -> dict:
    # Check escalation criteria first (ANY triggers escalation)
    escalation_reasons = []

    if fraud_signals:
        escalation_reasons.append(f"{len(fraud_signals)} fraud signal(s) detected: {'; '.join(fraud_signals)}")

    if claim.damage_amount_estimate > claim.policy_coverage_limit:
        escalation_reasons.append(
            f"Damage estimate (${claim.damage_amount_estimate:,.2f}) exceeds "
            f"policy coverage limit (${claim.policy_coverage_limit:,.2f})"
        )

    if claim.damage_amount_estimate > 15000:
        escalation_reasons.append(
            f"High-dollar claim (${claim.damage_amount_estimate:,.2f}) requires senior review"
        )

    if claim.fault_determination == "policyholder" and claim.damage_amount_estimate > 7500:
        escalation_reasons.append(
            f"Policyholder at fault with significant damage (${claim.damage_amount_estimate:,.2f})"
        )

    if escalation_reasons:
        has_fraud = len(fraud_signals) > 0
        return {
            "decision": Decision.ESCALATION,
            "queue": "Escalation Queue",
            "recommended_adjuster": "SIU (Special Investigations)" if has_fraud else "Senior Claims Adjuster",
            "estimated_review_time": "5-10 business days" if has_fraud else "3-10 business days",
            "estimated_payout_range": (
                f"Up to ${claim.policy_coverage_limit:,.2f}"
                if claim.damage_amount_estimate > claim.policy_coverage_limit
                else None
            ),
            "confidence_score": round(random.uniform(0.82, 0.95), 2),
            "reasoning": "Claim routed to escalation queue. " + ". ".join(escalation_reasons) + ".",
            "escalation_reason": "; ".join(escalation_reasons),
        }

    # Check fast-track criteria (ALL must be true)
    is_fast_track = (
        claim.damage_amount_estimate < 5000
        and claim.fault_determination in ["other_party", "shared"]
        and claim.police_report_filed is True
        and claim.prior_claims_count <= 1
    )

    if is_fast_track:
        payout_est = max(claim.damage_amount_estimate - claim.deductible, 0)
        return {
            "decision": Decision.FAST_TRACK,
            "queue": "Fast-Track Queue",
            "recommended_adjuster": "Junior Claims Adjuster",
            "estimated_review_time": "1-2 business days",
            "estimated_payout_range": f"${payout_est:,.2f} (pending adjuster verification)",
            "confidence_score": round(random.uniform(0.90, 0.97), 2),
            "reasoning": (
                "Simple, well-documented, low-dollar claim — routed to fast-track queue "
                "for expedited processing. Other party at fault, police report on file, "
                "clean claims history."
            ),
            "escalation_reason": None,
        }

    # Standard review (everything else)
    return {
        "decision": Decision.STANDARD_REVIEW,
        "queue": "Standard Review Queue",
        "recommended_adjuster": "Standard Claims Adjuster",
        "estimated_review_time": "2-4 business days",
        "estimated_payout_range": "TBD pending investigation",
        "confidence_score": round(random.uniform(0.70, 0.85), 2),
        "reasoning": (
            "Moderate complexity claim requires standard adjuster investigation. "
            f"Damage estimate: ${claim.damage_amount_estimate:,.2f}, "
            f"fault: {claim.fault_determination.replace('_', ' ')}."
        ),
        "escalation_reason": None,
    }


def _detect_fraud_signals(claim: ClaimInput) -> list[str]:
    signals = []
    if claim.airbags_deployed and claim.vehicle_drivable:
        signals.append("Airbags deployed but vehicle drivable (inconsistent)")
    if claim.vehicle_mileage > 150000 and claim.damage_amount_estimate > 8000:
        signals.append("High-value claim on high-mileage vehicle (>150k miles)")
    if not claim.police_report_filed and claim.damage_amount_estimate > 7500:
        signals.append("No police report on high-value claim (>$7,500)")
    if claim.prior_claims_count > 3:
        signals.append(f"Excessive claims history ({claim.prior_claims_count} prior claims)")
    return signals


def _verify_policy(claim: ClaimInput) -> str:
    return (
        f"Policy {claim.policy_number} verified for {claim.policyholder_name}. "
        f"Coverage limit: ${claim.policy_coverage_limit:,.2f}. "
        f"Deductible: ${claim.deductible:,.2f}."
    )


def _assess_damage(claim: ClaimInput) -> str:
    drivable_status = "Vehicle is drivable" if claim.vehicle_drivable else "Vehicle is not drivable"
    airbag_status = "airbags deployed" if claim.airbags_deployed else "airbags not deployed"
    return (
        f"{claim.vehicle_year} {claim.vehicle_make} {claim.vehicle_model} — "
        f"{claim.collision_type.value.replace('_', ' ')} collision. "
        f"{drivable_status}, {airbag_status}. "
        f"Estimated damage: ${claim.damage_amount_estimate:,.2f}."
    )


def _build_next_steps(decision: Decision, claim: ClaimInput, fraud_signals: list[str]) -> list[str]:
    if decision == Decision.FAST_TRACK:
        return [
            "Assign to junior adjuster for expedited review",
            "Verify police report documentation",
            "Process preliminary payout estimate within 1-2 business days",
        ]
    if decision == Decision.ESCALATION:
        steps = ["Assign to senior claims adjuster for detailed review"]
        if fraud_signals:
            steps.append("Flag for SIU (Special Investigations Unit) review")
        if claim.damage_amount_estimate > claim.policy_coverage_limit:
            steps.append("Notify policyholder of potential coverage gap")
        steps.append("Request additional documentation from policyholder")
        steps.append("Schedule adjuster site inspection")
        return steps
    return [
        "Assign to standard claims adjuster",
        "Request repair estimate from certified body shop",
        "Review police report and witness statements if available",
        "Contact policyholder within 2 business days with status update",
    ]
