import { useEffect, useState } from "react";

const DECISION_COLORS = {
  fast_track: "bg-green-100 text-green-800",
  standard_review: "bg-yellow-100 text-yellow-800",
  escalation: "bg-red-100 text-red-800",
};

const DECISION_LABELS = {
  fast_track: "Fast-Track",
  standard_review: "Standard Review",
  escalation: "Escalation",
};

const ROLE_ACTIONS = {
  fast_track: {
    role: "Junior Claims Adjuster",
    actions: [
      { label: "Approve Claim", color: "bg-green-600 hover:bg-green-700", action: "approve this claim" },
      { label: "Request More Information", color: "bg-gray-500 hover:bg-gray-600", action: "request more information from the policyholder" },
      { label: "Escalate to Senior", color: "bg-yellow-500 hover:bg-yellow-600", action: "escalate this claim to a senior adjuster" },
    ],
  },
  standard_review: {
    role: "Standard Claims Adjuster",
    actions: [
      { label: "Approve Claim", color: "bg-green-600 hover:bg-green-700", action: "approve this claim" },
      { label: "Deny Claim", color: "bg-red-600 hover:bg-red-700", action: "deny this claim" },
      { label: "Request More Information", color: "bg-gray-500 hover:bg-gray-600", action: "request more information from the policyholder" },
      { label: "Escalate to Senior", color: "bg-yellow-500 hover:bg-yellow-600", action: "escalate this claim to a senior adjuster" },
    ],
  },
  escalation: {
    role: "Senior Claims Adjuster / SIU",
    actions: [
      { label: "Approve Claim", color: "bg-green-600 hover:bg-green-700", action: "approve this claim" },
      { label: "Deny Claim", color: "bg-red-600 hover:bg-red-700", action: "deny this claim" },
      { label: "Flag for Fraud Investigation", color: "bg-red-800 hover:bg-red-900", action: "flag this claim for SIU fraud investigation" },
      { label: "Request More Information", color: "bg-gray-500 hover:bg-gray-600", action: "request more information from the policyholder" },
      { label: "Escalate to Manager", color: "bg-purple-600 hover:bg-purple-700", action: "escalate this claim to a claims manager" },
    ],
  },
};

function ClaimDetailModal({ claim, onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleAction(action) {
    alert(
      `In production, this would ${action}. Feature not implemented in prototype.`
    );
  }

  function formatTimestamp(iso) {
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  const roleConfig = ROLE_ACTIONS[claim.decision] || ROLE_ACTIONS.standard_review;
  const cd = claim.claim_data;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="space-y-6 p-6">
          {/* A) Header */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {claim.claim_id}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${DECISION_COLORS[claim.decision]}`}
              >
                {DECISION_LABELS[claim.decision]}
              </span>
              <span className="text-sm text-gray-500">
                Submitted on {formatTimestamp(claim.timestamp)}
              </span>
            </div>
          </div>

          {/* AI Triage Decision */}
          <div className="rounded-md border border-gray-200 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              AI Triage Decision
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Queue Assignment</p>
                <p className="text-sm font-medium text-gray-900">
                  {claim.queue}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Recommended Adjuster</p>
                <p className="text-sm font-medium text-gray-900">
                  {claim.recommended_adjuster}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Estimated Review Time</p>
                <p className="text-sm font-medium text-gray-900">
                  {claim.estimated_review_time}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Confidence Score</p>
                <p className="text-sm font-medium text-gray-900">
                  {(claim.confidence_score * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          {/* Decision Breakdown */}
          {claim.criteria_checks && claim.criteria_checks.length > 0 && (
            <div className="rounded-md border border-gray-200 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Decision Breakdown
              </h3>
              <div className="space-y-2">
                {claim.criteria_checks.map((check, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 rounded-md px-3 py-2 text-sm ${
                      check.passed
                        ? "bg-green-50 text-green-800"
                        : "bg-red-50 text-red-800"
                    }`}
                  >
                    <span className="mt-0.5 flex-shrink-0 font-bold">
                      {check.passed ? "\u2713" : "\u2717"}
                    </span>
                    <div>
                      <span className="font-medium">{check.label}:</span>{" "}
                      <span>{check.value}</span>
                      <p className="text-xs opacity-70">{check.threshold}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payout Calculation */}
              {claim.payout_calculation && (
                <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                    Payout Calculation
                  </p>
                  <div className="mt-2 space-y-1 font-mono text-sm text-green-800">
                    <p>
                      Damage estimate:{" "}
                      <span className="font-semibold">
                        ${claim.payout_calculation.damage_estimate.toLocaleString()}
                      </span>
                    </p>
                    <p>
                      Minus deductible:{" "}
                      <span className="font-semibold">
                        -${claim.payout_calculation.deductible.toLocaleString()}
                      </span>
                    </p>
                    <div className="border-t border-green-300 pt-1">
                      <p>
                        Recommended payout:{" "}
                        <span className="text-base font-bold">
                          ${claim.payout_calculation.recommended_payout.toLocaleString()}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Reasoning */}
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              AI Reasoning
            </h3>
            <div className="rounded-md bg-gray-50 p-4">
              <p className="text-sm text-gray-700">{claim.reasoning}</p>
            </div>
          </div>

          {/* Fraud Signals */}
          {claim.fraud_signals.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-600">
                Fraud Signals Detected
              </h3>
              <div className="flex flex-wrap gap-2">
                {claim.fraud_signals.map((signal, i) => (
                  <span
                    key={i}
                    className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Estimated Payout */}
          <div className="rounded-md border border-gray-200 p-4">
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Estimated Payout
            </h3>
            <p className="text-lg font-bold text-gray-900">
              {claim.estimated_payout_range || "TBD pending investigation"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Pending adjuster verification
            </p>
          </div>

          {/* Escalation Reason (right after payout for visibility) */}
          {claim.escalation_reason && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4">
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-yellow-700">
                Escalation Reason
              </h3>
              <p className="text-sm text-yellow-800">
                {claim.escalation_reason}
              </p>
            </div>
          )}

          {/* Claim Summary Line */}
          {cd && (
            <div className="rounded-md bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-800">
                <span className="font-semibold">{cd.policyholder_name}</span>
                <span className="mx-2 text-gray-300">|</span>
                {cd.policy_number}
                <span className="mx-2 text-gray-300">|</span>
                {cd.vehicle_year} {cd.vehicle_make} {cd.vehicle_model}
              </p>
            </div>
          )}

          {/* Decision Factors */}
          {cd && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Decision Factors
              </h3>
              <div className="overflow-x-auto rounded-md border border-gray-200">
                <table className="min-w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100 bg-white">
                      <td className="px-4 py-2 font-medium text-gray-500">Damage Estimate</td>
                      <td className="px-4 py-2 font-semibold text-gray-900">
                        ${cd.damage_amount_estimate?.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-500">Fault</td>
                      <td className="px-4 py-2 font-semibold text-gray-900">
                        {cd.fault_determination?.replace(/_/g, " ")}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-500">Police Report</td>
                      <td className="px-4 py-2 font-semibold text-gray-900">
                        {cd.police_report_filed ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-500">Prior Claims</td>
                      <td className="px-4 py-2 font-semibold text-gray-900">{cd.prior_claims_count}</td>
                    </tr>
                    <tr className="border-b border-gray-100 bg-white">
                      <td className="px-4 py-2 font-medium text-gray-500">Coverage Limit</td>
                      <td className="px-4 py-2 font-semibold text-gray-900">
                        ${cd.policy_coverage_limit?.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-500">Deductible</td>
                      <td className="px-4 py-2 font-semibold text-gray-900">
                        ${cd.deductible?.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-500">Vehicle Drivable</td>
                      <td className="px-4 py-2 font-semibold text-gray-900">
                        {cd.vehicle_drivable ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-500">Airbags Deployed</td>
                      <td className="px-4 py-2 font-semibold text-gray-900">
                        {cd.airbags_deployed ? "Yes" : "No"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Full Claim Details - Collapsible */}
          {cd && (
            <ClaimDetails claim={claim} cd={cd} />
          )}

          {/* H) Next Steps */}
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Recommended Next Steps
            </h3>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
              {claim.next_steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          {/* Action Buttons - Role Based */}
          <div className="border-t border-gray-200 pt-4">
            <p className="mb-1 text-xs font-medium text-gray-500">
              Adjuster Actions
            </p>
            <p className="mb-3 text-xs text-gray-400">
              Authorized for: {roleConfig.role}
            </p>
            <div className="flex flex-wrap gap-2">
              {roleConfig.actions.map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => handleAction(btn.action)}
                  className={`rounded-md px-4 py-2 text-sm font-medium text-white ${btn.color}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Regulatory Compliance Disclaimer */}
          <div className="rounded-md border border-gray-300 bg-gray-100 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
              AI Recommendation Disclaimer
            </p>
            <p className="text-xs leading-relaxed text-gray-600">
              This is an AI-generated <span className="font-semibold">RECOMMENDATION</span> based
              on deterministic criteria evaluation. All values shown are derived
              directly from claim input data — no generative AI or language
              models produce this output.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <p className="font-semibold text-gray-700">Final Decision Authority</p>
                <p>Licensed Claims Adjuster</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">AI Role</p>
                <p>Decision support only</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              The assigned adjuster must verify all claim data, review
              supporting documentation, apply professional judgment, and
              approve or modify this recommendation before any action is taken.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClaimDetails({ claim, cd }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-600 hover:bg-gray-50"
      >
        <span>Full Claim Details</span>
        <span className="text-xs text-gray-400">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="border-t border-gray-200 px-4 pb-4 pt-3 space-y-4">
          <div className="overflow-x-auto rounded-md border border-gray-100">
            <table className="min-w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100 bg-white">
                  <td className="px-4 py-2 font-medium text-gray-500">VIN</td>
                  <td className="px-4 py-2 text-gray-900">{cd.vehicle_vin}</td>
                  <td className="px-4 py-2 font-medium text-gray-500">Mileage</td>
                  <td className="px-4 py-2 text-gray-900">
                    {cd.vehicle_mileage?.toLocaleString()} mi
                  </td>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-500">Collision Type</td>
                  <td className="px-4 py-2 text-gray-900">
                    {cd.collision_type?.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-500">Submission Date</td>
                  <td className="px-4 py-2 text-gray-900">{cd.submission_date}</td>
                </tr>
                <tr className="border-b border-gray-100 bg-white">
                  <td className="px-4 py-2 font-medium text-gray-500">Incident Date</td>
                  <td className="px-4 py-2 text-gray-900">{cd.date_of_incident}</td>
                  <td className="px-4 py-2 font-medium text-gray-500">Incident Time</td>
                  <td className="px-4 py-2 text-gray-900">{cd.time_of_incident}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-500">Location</td>
                  <td className="px-4 py-2 text-gray-900" colSpan="3">
                    {cd.location_address}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {cd.damage_description && (
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Damage Description</p>
              <p className="mt-1 text-sm text-gray-700">{cd.damage_description}</p>
            </div>
          )}
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-500">Policy Verification</p>
            <p className="mt-1 text-sm text-gray-700">{claim.policy_verification}</p>
          </div>
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-500">Damage Assessment</p>
            <p className="mt-1 text-sm text-gray-700">{claim.damage_assessment}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClaimDetailModal;
