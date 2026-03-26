import { useState, useEffect } from "react";
import axios from "axios";
import ClaimDetailModal from "./ClaimDetailModal";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const PAGE_SIZE = 10;

const QUEUES = [
  {
    key: "fast_track",
    label: "Fast-Track Queue",
    adjuster: "Junior Claims Adjusters",
    activeClass: "bg-green-100 text-green-800 border-green-300",
    emptyMsg:
      "No fast-track claims yet. Claims meeting auto-approval criteria will appear here.",
  },
  {
    key: "standard_review",
    label: "Standard Review Queue",
    adjuster: "Standard Claims Adjusters",
    activeClass: "bg-yellow-100 text-yellow-800 border-yellow-300",
    emptyMsg:
      "No standard review claims yet. Moderate complexity claims will appear here.",
  },
  {
    key: "escalation",
    label: "Senior Review Queue",
    adjuster: "Senior Claims Adjusters / SIU",
    activeClass: "bg-red-100 text-red-800 border-red-300",
    emptyMsg:
      "No senior review claims yet. High-risk or high-dollar claims will appear here.",
  },
];

const PROFILE_QUEUES = {
  Admin: ["fast_track", "standard_review", "escalation"],
  "Junior Adjuster 1": ["fast_track"],
  "Junior Adjuster 2": ["fast_track"],
  "Standard Adjuster 1": ["standard_review"],
  "Standard Adjuster 2": ["standard_review"],
  "Senior Adjuster 1": ["escalation"],
  "Senior Adjuster 2": ["escalation"],
};

function downloadCSV(claims, queueLabel) {
  const headers = [
    "claim_id",
    "assigned_to",
    "status",
    "queue",
    "decision",
    "recommended_adjuster",
    "estimated_review_time",
    "estimated_payout_range",
    "confidence_score",
    "reasoning",
    "fraud_signals",
    "escalation_reason",
    "timestamp",
  ];

  const rows = claims.map((c) =>
    [
      c.claim_id,
      c.assigned_to || "",
      c.status || "Assigned",
      c.queue,
      c.decision,
      c.recommended_adjuster,
      c.estimated_review_time,
      c.estimated_payout_range || "",
      (c.confidence_score * 100).toFixed(0) + "%",
      '"' + (c.reasoning || "").replace(/"/g, '""') + '"',
      '"' + (c.fraud_signals || []).join("; ") + '"',
      '"' + (c.escalation_reason || "").replace(/"/g, '""') + '"',
      c.timestamp,
    ].join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    queueLabel.replace(/ /g, "_").toLowerCase() + "_export.csv"
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function QueueView({ currentProfile, showOnlyMyClaims, setShowOnlyMyClaims, onClaimUpdated }) {
  const allowedQueues = PROFILE_QUEUES[currentProfile] || [];
  const isAdmin = currentProfile === "Admin";

  const [selectedQueue, setSelectedQueue] = useState("fast_track");
  const [allClaims, setAllClaims] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [page, setPage] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusFilter, setStatusFilter] = useState("pending");

  function handleClaimUpdated() {
    setRefreshTrigger((prev) => prev + 1);
    if (onClaimUpdated) onClaimUpdated();
  }

  // When profile changes, switch to an allowed queue
  useEffect(() => {
    setSelectedClaim(null);
    if (!isAdmin && !allowedQueues.includes(selectedQueue) && selectedQueue !== "all") {
      setSelectedQueue(allowedQueues[0] || "fast_track");
    }
  }, [currentProfile]);

  // Fetch counts for all queues
  useEffect(() => {
    Promise.all(
      QUEUES.map((q) =>
        axios.get(`${API_URL}/queue/${q.key}`).then((res) => ({
          key: q.key,
          count: res.data.length,
        }))
      )
    )
      .then((results) => {
        const map = {};
        results.forEach((r) => {
          map[r.key] = r.count;
        });
        setCounts(map);
      })
      .catch(() => {});
  }, [refreshTrigger]);

  // Fetch claims when queue changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelectedClaim(null);
    setPage(0);

    if (selectedQueue === "all") {
      Promise.all(
        QUEUES.map((q) => axios.get(`${API_URL}/queue/${q.key}`))
      )
        .then((responses) => {
          setAllClaims(responses.flatMap((r) => r.data));
        })
        .catch((err) => {
          setError(err.response?.data?.detail || "Failed to load claims");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      axios
        .get(`${API_URL}/queue/${selectedQueue}`)
        .then((res) => {
          setAllClaims(res.data);
          setCounts((prev) => ({ ...prev, [selectedQueue]: res.data.length }));
        })
        .catch((err) => {
          setError(err.response?.data?.detail || "Failed to load queue");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [selectedQueue, refreshTrigger]);

  // Apply profile filtering
  const profileFiltered =
    !isAdmin && showOnlyMyClaims
      ? allClaims.filter((c) => c.assigned_to === currentProfile)
      : allClaims;

  // Apply status filtering
  const filteredClaims =
    statusFilter === "all"
      ? profileFiltered
      : statusFilter === "pending"
        ? profileFiltered.filter((c) => c.status !== "Approved" && c.status !== "Denied")
        : statusFilter === "finished"
          ? profileFiltered.filter((c) => c.status === "Approved" || c.status === "Denied")
          : profileFiltered.filter((c) => c.status === statusFilter);

  const queueConfig = QUEUES.find((q) => q.key === selectedQueue);
  const totalCount =
    (counts["fast_track"] || 0) +
    (counts["standard_review"] || 0) +
    (counts["escalation"] || 0);

  const isSeniorQueue =
    selectedQueue === "escalation" || currentProfile.includes("Senior");

  const sortedClaims = [...filteredClaims].sort((a, b) => {
    // Fraud-first sort for Senior queue
    if (isSeniorQueue) {
      const aFraud = (a.fraud_signals || []).length;
      const bFraud = (b.fraud_signals || []).length;
      if (aFraud !== bFraud) return bFraud - aFraud;
    }
    const diff = new Date(b.timestamp) - new Date(a.timestamp);
    return sortNewestFirst ? diff : -diff;
  });

  const fraudClaimsCount = filteredClaims.filter(
    (c) => c.fraud_signals && c.fraud_signals.length > 0
  ).length;

  const displayClaims = sortedClaims;

  function canAccessQueue(queueKey) {
    if (isAdmin) return true;
    return allowedQueues.includes(queueKey);
  }

  function formatTimestamp(iso) {
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  const queuePageTitle = isAdmin
    ? "All Claims"
    : currentProfile.includes("Junior")
      ? "Your Fast-Track Queue"
      : currentProfile.includes("Standard")
        ? "Your Standard Review Queue"
        : "Your Senior Review Queue";

  // Status counts for adjuster view
  const myClaims = allClaims.filter((c) => c.assigned_to === currentProfile);
  const myAssigned = myClaims.filter((c) => c.status === "Assigned").length;
  const myInReview = myClaims.filter((c) => c.status === "In Review").length;
  const myEscalated = myClaims.filter((c) => c.status === "Escalated").length;
  const myFinished = myClaims.filter(
    (c) => c.status === "Approved" || c.status === "Denied"
  ).length;

  return (
    <div>
      {/* Adjuster View */}
      {!isAdmin && (
        <>
          {/* Status Count Cards */}
          <div className="mb-4 grid grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => { setStatusFilter("Assigned"); setShowOnlyMyClaims(true); }}
              className={`rounded-lg p-3 text-center transition-all ${statusFilter === "Assigned" ? "ring-2 ring-offset-1" : ""}`}
              style={{
                backgroundColor: "#EFF6FF",
                borderLeft: "3px solid #1E3A5F",
                ...(statusFilter === "Assigned" ? { ringColor: "#1E3A5F" } : {}),
              }}
            >
              <p className="text-2xl font-bold" style={{ color: "#1E3A5F" }}>{myAssigned}</p>
              <p className="text-xs font-medium text-gray-600">Assigned</p>
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter("In Review"); setShowOnlyMyClaims(true); }}
              className={`rounded-lg border border-blue-200 bg-blue-50 p-3 text-center transition-all ${statusFilter === "In Review" ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
            >
              <p className="text-2xl font-bold text-blue-900">{myInReview}</p>
              <p className="text-xs font-medium text-gray-600">In Review</p>
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter("Escalated"); setShowOnlyMyClaims(true); }}
              className={`rounded-lg border border-purple-200 bg-purple-50 p-3 text-center transition-all ${statusFilter === "Escalated" ? "ring-2 ring-purple-500 ring-offset-1" : ""}`}
            >
              <p className="text-2xl font-bold text-purple-900">{myEscalated}</p>
              <p className="text-xs font-medium text-gray-600">Escalated</p>
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter("finished"); setShowOnlyMyClaims(true); }}
              className={`rounded-lg border border-green-200 bg-green-50 p-3 text-center transition-all ${statusFilter === "finished" ? "ring-2 ring-green-500 ring-offset-1" : ""}`}
            >
              <p className="text-2xl font-bold text-green-900">{myFinished}</p>
              <p className="text-xs font-medium text-gray-600">Finished</p>
            </button>
          </div>
        </>
      )}

      {/* Fraud Alert Banner (Senior queue) */}
      {isSeniorQueue && fraudClaimsCount > 0 && (
        <div
          className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 p-4"
          style={{
            backgroundColor: "#FEF2F2",
            borderLeftWidth: "4px",
            borderLeftColor: "#DC2626",
          }}
        >
          <span className="text-xl">&#9888;</span>
          <div>
            <p className="font-semibold text-red-900">
              {fraudClaimsCount}{" "}
              {fraudClaimsCount === 1 ? "claim has" : "claims have"} active
              fraud signals
            </p>
            <p className="mt-1 text-sm text-red-700">
              Fraud-flagged claims appear at the top of the queue
            </p>
          </div>
        </div>
      )}

      {/* Admin Controls */}
      {isAdmin && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm italic text-gray-500">
            Admin view — showing all claims across all queues
          </p>
        </div>
      )}

      {/* Queue Tabs — Admin only sees these */}
      {isAdmin && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedQueue("all")}
            className={`rounded-md border px-4 py-2 text-sm font-medium ${
              selectedQueue === "all"
                ? "border-blue-300 bg-blue-100 text-blue-800"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            All ({totalCount || "..."})
          </button>
          {QUEUES.map((q) => (
            <button
              key={q.key}
              type="button"
              onClick={() => setSelectedQueue(q.key)}
              className={`rounded-md border px-4 py-2 text-sm font-medium ${
                selectedQueue === q.key
                  ? q.activeClass
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {q.label.replace(" Queue", "")} ({counts[q.key] ?? "..."})
            </button>
          ))}
        </div>
      )}

      {/* Queue Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          {isAdmin && (
            <h3 className="text-lg font-semibold text-gray-800">
              {selectedQueue === "all" ? "All Claims" : queueConfig?.label}
            </h3>
          )}
          <p className="text-sm text-gray-500">
            {showOnlyMyClaims && !isAdmin
              ? `Showing ${sortedClaims.length} of your assigned claims`
              : `Showing ${displayClaims.length} of ${sortedClaims.length} claims`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isAdmin && (
            <label
              key={`filter-${currentProfile}`}
              className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600"
            >
              <input
                type="checkbox"
                checked={showOnlyMyClaims}
                onChange={(e) => setShowOnlyMyClaims(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300"
              />
              My claims
            </label>
          )}
          <div className="flex rounded-md border border-gray-300">
            {[
              { key: "pending", label: "Pending" },
              { key: "finished", label: "Finished" },
              { key: "all", label: "All" },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => { setStatusFilter(f.key); setPage(0); }}
                className={`px-3 py-1 text-xs font-medium ${
                  statusFilter === f.key
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                } ${f.key === "pending" ? "rounded-l-md" : ""} ${f.key === "all" ? "rounded-r-md" : ""}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSortNewestFirst(!sortNewestFirst)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Sort by: {sortNewestFirst ? "Newest First" : "Oldest First"}
          </button>
          {sortedClaims.length > 0 && (
            <button
              type="button"
              onClick={() =>
                downloadCSV(
                  sortedClaims,
                  selectedQueue === "all" ? "All Claims" : queueConfig.label
                )
              }
              className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <span>&#8595;</span>
              Export All ({sortedClaims.length})
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
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
          Loading claims...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sortedClaims.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-500">
            {showOnlyMyClaims && !isAdmin
              ? `No claims assigned to ${currentProfile} in this queue`
              : selectedQueue === "all"
                ? "No claims processed yet."
                : queueConfig.emptyMsg}
          </p>
          {showOnlyMyClaims && !isAdmin && (
            <button
              type="button"
              onClick={() => setShowOnlyMyClaims(false)}
              className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Show all claims in this queue
            </button>
          )}
        </div>
      )}

      {/* Claims Table */}
      {!loading && !error && sortedClaims.length > 0 && (
        <>
          <div className="overflow-auto rounded-md border border-gray-200" style={{ maxHeight: "500px" }}>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <th className="px-4 py-3">Claim ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Estimated Payout</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Fraud Signals</th>
                </tr>
              </thead>
              <tbody>
                {displayClaims.map((claim, i) => {
                  const hasFraud =
                    claim.fraud_signals && claim.fraud_signals.length > 0;
                  return (
                  <tr
                    key={claim.claim_id}
                    onClick={() => setSelectedClaim(claim)}
                    className={`cursor-pointer border-t border-gray-100 hover:bg-blue-50 ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                    style={
                      hasFraud
                        ? {
                            backgroundColor: "#FFFBEB",
                            borderLeftWidth: "4px",
                            borderLeftColor: "#DC2626",
                            borderLeftStyle: "solid",
                          }
                        : {}
                    }
                  >
                    <td className="px-4 py-3">
                      <span
                        className="font-mono font-medium"
                        style={{ color: "#1E3A5F" }}
                      >
                        {claim.claim_id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          claim.status === "Approved"
                            ? "bg-green-100 text-green-800"
                            : claim.status === "Denied"
                              ? "bg-red-100 text-red-800"
                              : claim.status === "Escalated"
                                ? "bg-purple-100 text-purple-800"
                                : claim.status === "In Review"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {claim.status || "Assigned"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {claim.assigned_to ? (
                        <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          {claim.assigned_to}
                        </span>
                      ) : (
                        <span className="text-xs italic text-gray-400">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {claim.estimated_payout_range || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(claim.confidence_score * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatTimestamp(claim.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      {claim.fraud_signals.length > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold"
                          style={{
                            backgroundColor: "#FEE2E2",
                            color: "#B91C1C",
                            borderColor: "#DC2626",
                          }}
                        >
                          &#9888; FRAUD &middot; {claim.fraud_signals.length}
                        </span>
                      ) : (
                        <span className="text-gray-400">&mdash;</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </>
      )}

      {/* Personal Stats (adjuster only, below table) */}
      {!isAdmin && myClaims.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Your Stats
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md bg-white p-3 text-center shadow-sm">
              <p className="text-lg font-bold text-gray-900">{myClaims.length}</p>
              <p className="text-xs text-gray-500">Total Assigned</p>
            </div>
            <div className="rounded-md bg-white p-3 text-center shadow-sm">
              <p className="text-lg font-bold text-green-700">
                {myClaims.filter((c) => c.status === "Approved").length}
              </p>
              <p className="text-xs text-gray-500">Approved</p>
            </div>
            <div className="rounded-md bg-white p-3 text-center shadow-sm">
              <p className="text-lg font-bold text-red-700">
                {myClaims.filter((c) => c.status === "Denied").length}
              </p>
              <p className="text-xs text-gray-500">Denied</p>
            </div>
            <div className="rounded-md bg-white p-3 text-center shadow-sm">
              <p className="text-lg font-bold text-purple-700">{myEscalated}</p>
              <p className="text-xs text-gray-500">Escalated</p>
            </div>
          </div>
        </div>
      )}

      {/* Claim Detail Modal */}
      {selectedClaim && (
        <ClaimDetailModal
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
          onClaimUpdated={handleClaimUpdated}
        />
      )}
    </div>
  );
}

export default QueueView;
