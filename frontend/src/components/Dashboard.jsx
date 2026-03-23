import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_URL}/dashboard/metrics`)
      .then((res) => {
        setMetrics(res.data);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Failed to load metrics");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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
  const escalation = queue["Escalation Queue"] || 0;

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          Analytics Dashboard
        </h3>
        <p className="text-sm text-gray-500">
          Real-time triage performance metrics
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Hero Metric */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 sm:col-span-2">
          <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
            Total Claims Processed
          </p>
          <p className="mt-2 text-4xl font-bold text-blue-900">
            {metrics.total_processed}
          </p>
          <p className="mt-1 text-sm text-blue-600">
            claims triaged automatically
          </p>
        </div>

        {/* Time Saved */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Time Saved
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {metrics.time_saved_hours} hours
          </p>
          <p className="mt-1 text-sm text-gray-500">
            vs. 15 min manual triage per claim
          </p>
        </div>

        {/* Cost Savings */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Cost Savings
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            ${metrics.cost_saved_dollars.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            at $50/hour adjuster cost
          </p>
        </div>

        {/* Processing Speed */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Processing Speed
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {metrics.avg_processing_time} sec
          </p>
          <p className="mt-1 text-sm text-gray-500">average per claim</p>
        </div>

        {/* Queue Distribution - Full Width */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:col-span-2">
          <p className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500">
            Queue Distribution
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
                Fast-Track: {fastTrack}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-full bg-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-800">
                Standard: {standard}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-800">
                Escalation: {escalation}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
