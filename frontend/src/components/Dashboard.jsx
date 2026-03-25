import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

const STATUS_BAR_COLORS = {
  Approved: "bg-green-500",
  Denied: "bg-red-500",
  Escalated: "bg-purple-500",
  "In Review": "bg-blue-500",
  Assigned: "bg-gray-400",
};

function formatTime(seconds) {
  if (!seconds || seconds === 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

function Dashboard({ refreshTrigger, currentProfile }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTriageCriteria, setShowTriageCriteria] = useState(false);

  const isAdmin = !currentProfile || currentProfile === "Admin";

  useEffect(() => {
    if (!metrics) setLoading(true);
    const params = !isAdmin
      ? `?adjuster_name=${encodeURIComponent(currentProfile)}`
      : "";
    axios
      .get(`${API_URL}/dashboard/metrics${params}`)
      .then((res) => {
        setMetrics(res.data);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Failed to load metrics");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [refreshTrigger, currentProfile]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <svg
          className="h-5 w-5 animate-spin text-blue-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        Loading metrics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!metrics || metrics.total_processed === 0) {
    return (
      <p className="text-sm text-gray-500">
        No data yet. Process some claims to see metrics.
      </p>
    );
  }

  const queue = metrics.queue_distribution || {};
  const fastTrack = queue["Fast-Track Queue"] || 0;
  const standard = queue["Standard Review Queue"] || 0;
  const senior = queue["Senior Review Queue"] || 0;
  const pm = metrics.personal_metrics;

  const pageTitle = isAdmin ? "Operations Center" : "My Performance";
  const pageSubtitle = isAdmin
    ? "Platform oversight and operational intelligence"
    : `Personal metrics for ${currentProfile}`;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{pageTitle}</h2>
        <p className="mt-1 text-sm text-gray-600">{pageSubtitle}</p>
      </div>

      {/* Admin: Triage Criteria Reference */}
      {isAdmin && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowTriageCriteria(!showTriageCriteria)}
            className="flex w-full items-center justify-between rounded-lg border-2 border-gray-300 bg-white p-4 text-left hover:bg-gray-50"
          >
            <div>
              <h3 className="font-semibold text-gray-900">
                AI Triage Criteria Reference
              </h3>
              <p className="text-sm text-gray-600">
                Decision rules and queue routing thresholds
              </p>
            </div>
            <span className="text-gray-400">
              {showTriageCriteria ? "\u25BC" : "\u25B6"}
            </span>
          </button>
          {showTriageCriteria && (
            <div className="mt-3 space-y-5 rounded-lg border border-gray-300 bg-gray-50 p-6">
              <div>
                <span
                  className="inline-block rounded-full px-3 py-1 text-sm font-semibold"
                  style={{ backgroundColor: "#D1FAE5", color: "#065F46" }}
                >
                  Fast-Track Queue
                </span>
                <span className="ml-2 text-sm text-gray-500">1-2 business days</span>
                <ul className="mt-2 space-y-1 rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700">
                  <li>Damage estimate &lt; $5,000</li>
                  <li>Fault = other party or shared</li>
                  <li>Police report filed</li>
                  <li>Prior claims &le; 1</li>
                  <li>No fraud signals</li>
                </ul>
              </div>
              <div>
                <span
                  className="inline-block rounded-full px-3 py-1 text-sm font-semibold"
                  style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                >
                  Standard Review Queue
                </span>
                <span className="ml-2 text-sm text-gray-500">2-4 business days</span>
                <ul className="mt-2 space-y-1 rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700">
                  <li>Does not meet all fast-track criteria</li>
                  <li>No escalation triggers</li>
                  <li>Damage $5K-$15K, or policyholder at fault, or no police report</li>
                </ul>
              </div>
              <div>
                <span
                  className="inline-block rounded-full px-3 py-1 text-sm font-semibold"
                  style={{ backgroundColor: "#E0E7FF", color: "#312E81" }}
                >
                  Senior Review Queue
                </span>
                <span className="ml-2 text-sm text-gray-500">3-10 business days</span>
                <ul className="mt-2 space-y-1 rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700">
                  <li>Damage &gt; $15,000</li>
                  <li>OR fraud signals detected</li>
                  <li>OR damage exceeds coverage limit</li>
                  <li>OR policyholder at fault + damage &gt; $7,500</li>
                  <li>OR prior claims &gt; 3</li>
                </ul>
              </div>
              <div>
                <p className="mb-2 font-semibold text-red-800">Fraud Signal Rules</p>
                <ul className="space-y-1 rounded-md border border-red-200 bg-white p-3 text-sm text-gray-700">
                  <li>1. Airbags deployed but vehicle drivable</li>
                  <li>2. Mileage &gt; 150K and damage &gt; $8,000</li>
                  <li>3. No police report and damage &gt; $7,500</li>
                  <li>4. Prior claims &gt; 3</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Adjuster-only: simple personal stats */}
      {!isAdmin && pm && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div
              className="rounded-lg p-5"
              style={{ backgroundColor: "#EFF6FF", borderLeft: "3px solid #1E3A5F" }}
            >
              <p className="text-xs font-medium text-gray-500">Pending Claims</p>
              <p className="mt-1 text-3xl font-bold" style={{ color: "#1E3A5F" }}>
                {pm.pending_claims}
              </p>
            </div>
            <div
              className="rounded-lg p-5"
              style={{ backgroundColor: "#F0FDF4", borderLeft: "3px solid #16A34A" }}
            >
              <p className="text-xs font-medium text-gray-500">Claims Decided</p>
              <p className="mt-1 text-3xl font-bold text-green-800">
                {pm.total_handled}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500">Avg Pickup Time</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatTime(pm.avg_pickup_seconds)}
              </p>
              <p className="mt-1 text-xs text-gray-400">Assigned to In Review</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500">Avg Review Time</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatTime(pm.avg_review_seconds)}
              </p>
              <p className="mt-1 text-xs text-gray-400">In Review to Decision</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500">Approval Rate</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {pm.approval_rate}%
              </p>
              <p className="mt-1 text-xs text-gray-400">Approved vs Denied</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500">Escalation Rate</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {pm.escalation_rate}%
              </p>
              <p className="mt-1 text-xs text-gray-400">Claims Escalated</p>
            </div>
          </div>
        </div>
      )}

      {!isAdmin && !pm && (
        <p className="text-sm text-gray-500">No performance data yet. Start reviewing claims to see your stats.</p>
      )}

      {/* Platform Metrics — Admin only */}
      {isAdmin && (
      <>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Platform Overview
      </p>

      <div className="space-y-4">
        {/* Row 1: Total Claims + Time Saved */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            className="rounded-lg p-6"
            style={{ backgroundColor: "#EFF6FF", borderLeft: "4px solid #1E3A5F" }}
          >
            <p
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: "#1E3A5F" }}
            >
              Total Claims Triaged Automatically
            </p>
            <p
              className="mt-2 text-4xl font-bold"
              style={{ color: "#1E3A5F" }}
            >
              {metrics.total_processed}
            </p>
          </div>
          <div
            className="rounded-lg p-6"
            style={{ backgroundColor: "#F0FDF4", borderLeft: "4px solid #16A34A" }}
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-green-800">
              Time Saved
            </p>
            <p className="mt-2 text-4xl font-bold text-green-900">
              {metrics.time_saved_hours} hours
            </p>
            <p className="mt-2 text-xs text-green-700">
              AI triage: ~{metrics.avg_processing_time} sec avg &nbsp;|&nbsp; Manual triage: ~15 min avg
            </p>
          </div>
        </div>

        {/* Row 2: Status Breakdown + Queue Distribution */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
              Claim Status Breakdown
            </p>
            {metrics.status_breakdown && (
              <div className="space-y-2">
                {Object.entries(metrics.status_breakdown).map(
                  ([status, count]) => (
                    <div key={status} className="flex items-center gap-3">
                      <span className="w-20 text-xs font-medium text-gray-700">
                        {status}
                      </span>
                      <div className="h-2.5 flex-1 rounded-full bg-gray-100">
                        <div
                          className={`h-2.5 rounded-full ${STATUS_BAR_COLORS[status] || "bg-gray-400"}`}
                          style={{
                            width: `${(count / metrics.total_processed) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs font-bold text-gray-900">
                        {count}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
              Queue Distribution
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className="rounded-full px-3 py-1 text-sm font-semibold"
                  style={{ backgroundColor: "#D1FAE5", color: "#065F46" }}
                >
                  Fast-Track
                </span>
                <span className="text-lg font-bold text-gray-900">{fastTrack}</span>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className="rounded-full px-3 py-1 text-sm font-semibold"
                  style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                >
                  Standard
                </span>
                <span className="text-lg font-bold text-gray-900">{standard}</span>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className="rounded-full px-3 py-1 text-sm font-semibold"
                  style={{ backgroundColor: "#E0E7FF", color: "#312E81" }}
                >
                  Senior
                </span>
                <span className="text-lg font-bold text-gray-900">{senior}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Dual ROI */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Triage-Only ROI */}
          <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-900">
              Triage-Only ROI
            </p>
            <p className="mt-3 text-3xl font-bold text-blue-900">
              ${(metrics.triage_only_roi?.annual_savings || 0).toLocaleString()}
            </p>
            <p className="text-sm font-medium text-blue-800">
              Projected Annual Savings
            </p>
            <div className="mt-3 space-y-1 rounded-md bg-white/60 p-2 text-xs">
              <div className="flex justify-between text-blue-700">
                <span>Time saved per claim:</span>
                <span className="font-semibold text-blue-900">15 minutes</span>
              </div>
              <div className="flex justify-between text-blue-700">
                <span>This month:</span>
                <span className="font-semibold text-blue-900">
                  ${(metrics.triage_only_roi?.cost_saved_monthly || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-blue-700">
                <span>At scale:</span>
                <span className="font-semibold text-blue-900">10K claims/mo</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-blue-600">
              <span className="font-semibold">Scope:</span> AI routing decision
              replaces manual form review and complexity assessment.
            </p>
          </div>

          {/* Triage + Workflow Automation ROI */}
          <div className="rounded-lg border-2 border-green-300 bg-green-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-green-900">
              Triage + Workflow Automation ROI
            </p>
            <p className="mt-3 text-3xl font-bold text-green-900">
              ${(metrics.full_integration_roi?.annual_savings || 0).toLocaleString()}
            </p>
            <p className="text-sm font-medium text-green-800">
              Projected Annual Savings
            </p>
            <div className="mt-3 space-y-1 rounded-md bg-white/60 p-2 text-xs">
              <div className="flex justify-between text-green-700">
                <span>Time saved per claim:</span>
                <span className="font-semibold text-green-900">2 hours</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>This month:</span>
                <span className="font-semibold text-green-900">
                  ${(metrics.full_integration_roi?.cost_saved_monthly || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>At scale:</span>
                <span className="font-semibold text-green-900">10K claims/mo</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-green-600">
              <span className="font-semibold">Scope:</span> Triage +
              auto-assignment + documentation routing + adjuster handoff.
            </p>
          </div>
        </div>

        {/* Row 4: Speed + Decision Time + Escalation Rate + AI Accuracy */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              AI Triage Speed
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {metrics.avg_processing_time} sec
            </p>
            <p className="mt-1 text-xs text-gray-500">avg per claim</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Avg Time to Decision
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {metrics.avg_time_to_decision?.overall || 0} days
            </p>
            <p className="mt-1 text-xs text-gray-500">assigned to decided</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Escalation Rate
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {metrics.escalation_rate?.rate || 0}%
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {metrics.escalation_rate?.escalated_count || 0} of{" "}
              {metrics.escalation_rate?.total_count || 0} claims
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              AI Routing Accuracy
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {metrics.fast_track_success_rate?.rate || 0}%
            </p>
            <p className="mt-1 text-xs text-gray-500">
              fast-track claims approved as routed
            </p>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

export default Dashboard;
