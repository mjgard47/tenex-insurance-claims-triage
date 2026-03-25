import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

const STATUS_COLORS = {
  Assigned: "bg-gray-100 text-gray-800",
  "In Review": "bg-blue-100 text-blue-800",
  Approved: "bg-green-100 text-green-800",
  Denied: "bg-red-100 text-red-800",
  Escalated: "bg-purple-100 text-purple-800",
};

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

const ESCALATION_MAP = {
  "Fast-Track Queue": "Standard Review Queue",
  "Standard Review Queue": "Senior Review Queue",
  "Senior Review Queue": null,
};

function ClaimDetailModal({ claim, onClose, onClaimUpdated }) {
  const [updating, setUpdating] = useState(false);
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [escalationNotes, setEscalationNotes] = useState("");
  const [showOriginal, setShowOriginal] = useState(false);
  const [localStatus, setLocalStatus] = useState(claim.status || "Assigned");
  const [showDenialModal, setShowDenialModal] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);
  const [denialCode, setDenialCode] = useState("Coverage Exclusion");
  const [denialNotes, setDenialNotes] = useState("");

  const isEscalated = !!claim.escalated_from;

  const targetQueue = ESCALATION_MAP[claim.queue] || null;
  const canEscalate = targetQueue !== null;

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

  async function handleStatusUpdate(newStatus) {
    setUpdating(true);
    try {
      await axios.put(
        `${API_URL}/claims/${claim.claim_id}/status?status=${encodeURIComponent(newStatus)}`
      );
      if (newStatus === "In Review") {
        setLocalStatus("In Review");
      } else {
        if (onClaimUpdated) onClaimUpdated();
        onClose();
      }
    } catch (err) {
      alert("Failed to update status: " + (err.response?.data?.detail || err.message));
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeny() {
    if (!denialNotes.trim()) return;
    setUpdating(true);
    try {
      await axios.put(
        `${API_URL}/claims/${claim.claim_id}/deny?` +
          `denial_code=${encodeURIComponent(denialCode)}` +
          `&denial_notes=${encodeURIComponent(denialNotes)}` +
          `&denied_by=${encodeURIComponent(claim.assigned_to || "Unknown")}`
      );
      setShowDenialModal(false);
      setDenialCode("Coverage Exclusion");
      setDenialNotes("");
      if (onClaimUpdated) onClaimUpdated();
      onClose();
    } catch (err) {
      alert("Failed to deny: " + (err.response?.data?.detail || err.message));
    } finally {
      setUpdating(false);
    }
  }

  async function handleEscalate() {
    if (!escalationNotes.trim()) return;
    setUpdating(true);
    try {
      await axios.put(
        `${API_URL}/claims/${claim.claim_id}/escalate?` +
          `escalated_from=${encodeURIComponent(claim.assigned_to || "Unknown")}` +
          `&escalated_to_queue=${encodeURIComponent(targetQueue)}` +
          `&escalation_notes=${encodeURIComponent(escalationNotes)}`
      );
      setShowEscalationModal(false);
      setEscalationNotes("");
      if (onClaimUpdated) onClaimUpdated();
      onClose();
    } catch (err) {
      alert("Failed to escalate: " + (err.response?.data?.detail || err.message));
    } finally {
      setUpdating(false);
    }
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
            <h2
              className="font-mono text-2xl font-bold"
              style={{ color: "#1E3A5F" }}
            >
              {claim.claim_id}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${DECISION_COLORS[claim.decision]}`}
              >
                {DECISION_LABELS[claim.decision]}
              </span>
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${STATUS_COLORS[localStatus] || STATUS_COLORS.Assigned}`}
              >
                {localStatus}
              </span>
              {claim.assigned_to && (
                <span className="text-sm text-gray-500">
                  Assigned to: {claim.assigned_to}
                </span>
              )}
              <span className="text-sm text-gray-500">
                Submitted on {formatTimestamp(claim.timestamp)}
              </span>
            </div>
          </div>

          {/* Escalation Info */}
          {claim.escalated_from && (
            <div className="rounded-md border-2 border-purple-300 bg-purple-50 p-4">
              <h3 className="text-sm font-semibold text-purple-900">
                Escalated from: {claim.escalated_from}
              </h3>
              {claim.escalation_timestamp && (
                <p className="mt-1 text-xs text-purple-600">
                  {formatTimestamp(claim.escalation_timestamp)}
                </p>
              )}
              {claim.escalation_notes && (
                <div className="mt-2 rounded-md border border-purple-200 bg-white p-3">
                  <p className="text-xs font-medium text-gray-500">
                    Escalation reason:
                  </p>
                  <p className="mt-1 text-sm text-gray-800">
                    {claim.escalation_notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Current Assignment (shown when escalated) */}
          {isEscalated && (
            <div className="rounded-md border border-purple-200 bg-purple-50 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-purple-700">
                Current Assignment
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-purple-500">Current Queue</p>
                  <p className="text-sm font-medium text-gray-900">
                    {claim.queue}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-purple-500">Assigned To</p>
                  <p className="text-sm font-medium text-gray-900">
                    {claim.assigned_to || "Unassigned"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Denial Info */}
          {claim.denial_code && (
            <div className="rounded-md border-2 border-red-300 bg-red-50 p-4">
              <h3 className="text-sm font-semibold text-red-900">
                Claim Denied: {claim.denial_code}
              </h3>
              {claim.denied_by && (
                <p className="mt-1 text-xs text-red-600">
                  Denied by: {claim.denied_by}
                  {claim.denial_timestamp &&
                    ` on ${formatTimestamp(claim.denial_timestamp)}`}
                </p>
              )}
              {claim.denial_notes && (
                <div className="mt-2 rounded-md border border-red-200 bg-white p-3">
                  <p className="text-xs font-medium text-gray-500">
                    Denial explanation:
                  </p>
                  <p className="mt-1 text-sm text-gray-800">
                    {claim.denial_notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* AI Triage Decision — full view if not escalated, collapsible if escalated */}
          {isEscalated ? (
            <div className="rounded-md border border-gray-200">
              <button
                type="button"
                onClick={() => setShowOriginal(!showOriginal)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                <span>Original AI Recommendation</span>
                <span className="text-xs text-gray-400">
                  {showOriginal ? "Hide" : "Show"}
                </span>
              </button>
              {showOriginal && (
                <div className="border-t border-gray-200 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Original Queue</p>
                      <p className="text-sm font-medium text-gray-900">
                        {claim.decision === "fast_track"
                          ? "Fast-Track Queue"
                          : claim.decision === "standard_review"
                            ? "Standard Review Queue"
                            : "Senior Review Queue"}
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
              )}
            </div>
          ) : (
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
          )}

          {/* AI Triage Criteria */}
          {claim.criteria_checks && claim.criteria_checks.length > 0 && (
            <div className="rounded-md border border-gray-200">
              <button
                type="button"
                onClick={() => setShowCriteria(!showCriteria)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
              >
                <h3 className="text-sm font-semibold text-gray-700">
                  AI Triage Criteria —{" "}
                  {DECISION_LABELS[claim.decision] || "Standard Review"}
                </h3>
                <span className="text-gray-400">
                  {showCriteria ? "\u25BC" : "\u25B6"}
                </span>
              </button>
              {showCriteria && (
                <div className="border-t border-gray-200 p-4">
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

          {/* Action Buttons */}
          <div className="border-t border-gray-200 pt-4">
            <p className="mb-1 text-xs font-medium text-gray-500">
              Adjuster Actions
            </p>
            <p className="mb-3 text-xs text-gray-400">
              Authorized for: {roleConfig.role}
            </p>
            {localStatus !== "Approved" && localStatus !== "Denied" ? (
              <div className="flex flex-wrap gap-2">
                {(localStatus === "Assigned" || localStatus === "Escalated") && (
                  <>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleStatusUpdate("In Review")}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      Mark In Review
                    </button>
                    {canEscalate && (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => setShowEscalationModal(true)}
                        className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:bg-yellow-300"
                      >
                        Escalate
                      </button>
                    )}
                    <p className="w-full text-xs text-gray-400">
                      Mark as In Review before approving or denying
                    </p>
                  </>
                )}
                {localStatus === "In Review" && (
                  <>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleStatusUpdate("Approved")}
                      className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-green-300"
                    >
                      Approve Claim
                    </button>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => setShowDenialModal(true)}
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-red-300"
                    >
                      Deny Claim
                    </button>
                    {canEscalate && (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => setShowEscalationModal(true)}
                        className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:bg-yellow-300"
                      >
                        Escalate
                      </button>
                    )}
                  </>
                )}
                {!canEscalate && claim.queue === "Senior Review Queue" && (
                  <span className="px-2 py-2 text-xs italic text-gray-500">
                    Highest escalation level
                  </span>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-center">
                <p className="text-sm font-medium text-gray-700">
                  Claim has been {localStatus.toLowerCase()}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  No further actions available
                </p>
              </div>
            )}
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

          {/* Supporting Documentation */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-3 text-sm font-medium text-gray-700">
              Supporting Documentation
            </h3>
            <div
              title={"In production: Opens " + claim.claim_id + " in your existing claims management system (Guidewire, Duck Creek, etc.)"}
              className="w-full cursor-help rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-left hover:bg-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    View Full Claim in Claims Management System
                  </p>
                  <p className="text-xs text-gray-600">
                    Photos, documents, repair estimates, full history
                  </p>
                </div>
                <span className="text-xl text-gray-400">&#8594;</span>
              </div>
            </div>
            <p className="mt-2 px-1 text-xs italic text-gray-400">
              In production, this links directly to the claim record in your
              existing system. AI provides triage recommendations; your system
              maintains all documentation.
            </p>
          </div>
        </div>
      </div>

      {/* Denial Modal */}
      {showDenialModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDenialModal(false);
              setDenialCode("Coverage Exclusion");
              setDenialNotes("");
            }
          }}
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">
              Deny Claim {claim.claim_id}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              This decision is recorded in the audit log.
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Denial Reason Code *
              </label>
              <select
                value={denialCode}
                onChange={(e) => setDenialCode(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="Coverage Exclusion">Coverage Exclusion</option>
                <option value="Fraud Suspected">Fraud Suspected</option>
                <option value="Insufficient Documentation">Insufficient Documentation</option>
                <option value="Duplicate Claim">Duplicate Claim</option>
                <option value="Policy Not Active">Policy Not Active</option>
                <option value="Claim Amount Exceeds Policy Limit">Claim Amount Exceeds Policy Limit</option>
                <option value="Pre-Existing Damage">Pre-Existing Damage</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Detailed Explanation *
              </label>
              <textarea
                value={denialNotes}
                onChange={(e) => setDenialNotes(e.target.value)}
                placeholder="Provide detailed explanation for the denial decision. Include relevant policy sections, documentation issues, or investigation findings."
                rows="4"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                This explanation will be visible in the audit log and claim
                history
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDenialModal(false);
                  setDenialCode("Coverage Exclusion");
                  setDenialNotes("");
                }}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!denialNotes.trim() || updating}
                onClick={handleDeny}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Confirm Denial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalation Notes Modal */}
      {showEscalationModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEscalationModal(false);
              setEscalationNotes("");
            }
          }}
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">
              Escalate to {targetQueue}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              This claim will be moved and assigned to the appropriate adjuster.
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Why are you escalating this claim? *
              </label>
              <textarea
                value={escalationNotes}
                onChange={(e) => setEscalationNotes(e.target.value)}
                placeholder="Example: Customer disputes fault determination — need senior review of police report and witness statements"
                rows="4"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                This note will be visible to the next adjuster
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowEscalationModal(false);
                  setEscalationNotes("");
                }}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!escalationNotes.trim() || updating}
                onClick={handleEscalate}
                className="flex-1 rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}
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
