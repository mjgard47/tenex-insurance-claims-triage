import { useState, useEffect } from "react";
import axios from "axios";
import ClaimDetailModal from "./ClaimDetailModal";

const API_URL = "http://127.0.0.1:8000";

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
    label: "Escalation Queue",
    adjuster: "Senior Claims Adjusters / SIU",
    activeClass: "bg-red-100 text-red-800 border-red-300",
    emptyMsg:
      "No escalation claims yet. High-risk or high-dollar claims will appear here.",
  },
];

function QueueView() {
  const [selectedQueue, setSelectedQueue] = useState("fast_track");
  const [claims, setClaims] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  // Fetch counts for all queues on mount
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
  }, []);

  // Fetch claims when queue changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelectedClaim(null);

    axios
      .get(`${API_URL}/queue/${selectedQueue}`)
      .then((res) => {
        setClaims(res.data);
        setCounts((prev) => ({ ...prev, [selectedQueue]: res.data.length }));
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Failed to load queue");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedQueue]);

  const queueConfig = QUEUES.find((q) => q.key === selectedQueue);

  const sortedClaims = [...claims].sort((a, b) => {
    const diff = new Date(b.timestamp) - new Date(a.timestamp);
    return sortNewestFirst ? diff : -diff;
  });

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

  return (
    <div>
      {/* Queue Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
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

      {/* Queue Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {queueConfig.label}
          </h3>
          <p className="text-sm text-gray-500">
            Showing {claims.length} claims — Assigned to:{" "}
            {queueConfig.adjuster}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSortNewestFirst(!sortNewestFirst)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Sort by: {sortNewestFirst ? "Newest First" : "Oldest First"}
        </button>
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
      {!loading && !error && claims.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-500">{queueConfig.emptyMsg}</p>
        </div>
      )}

      {/* Claims Table */}
      {!loading && !error && claims.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                <th className="px-4 py-3">Claim ID</th>
                <th className="px-4 py-3">Queue</th>
                <th className="px-4 py-3">Estimated Payout</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Fraud Signals</th>
              </tr>
            </thead>
            <tbody>
              {sortedClaims.map((claim, i) => (
                <tr
                  key={claim.claim_id}
                  onClick={() => setSelectedClaim(claim)}
                  className={`cursor-pointer border-t border-gray-100 hover:bg-blue-50 ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {claim.claim_id}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{claim.queue}</td>
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
                      <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                        {claim.fraud_signals.length}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Claim Detail Modal */}
      {selectedClaim && (
        <ClaimDetailModal
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}
    </div>
  );
}

export default QueueView;
