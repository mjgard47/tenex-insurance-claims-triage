import { useState } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

const DECISION_COLORS = {
  fast_track: "bg-green-100 text-green-800 border-green-300",
  standard_review: "bg-yellow-100 text-yellow-800 border-yellow-300",
  escalation: "bg-red-100 text-red-800 border-red-300",
};

const DECISION_LABELS = {
  fast_track: "Fast-Track",
  standard_review: "Standard Review",
  escalation: "Escalation",
};

function ClaimUpload() {
  const [form, setForm] = useState({
    claim_id: "",
    policy_number: "",
    vehicle_make: "",
    vehicle_model: "",
    damage_amount_estimate: "",
    fault_determination: "other_party",
    police_report_filed: false,
    vehicle_drivable: true,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const payload = {
      claim_id: form.claim_id,
      submission_date: "2024-03-17",
      policy_number: form.policy_number,
      policyholder_name: "Test User",
      vehicle_year: 2020,
      vehicle_make: form.vehicle_make,
      vehicle_model: form.vehicle_model,
      vehicle_vin: "TEST123456789",
      vehicle_mileage: 50000,
      date_of_incident: "2024-03-16",
      time_of_incident: "14:00",
      location_address: "123 Test St, City, State",
      collision_type: "rear_end",
      damage_description: "Test damage",
      damage_amount_estimate: parseFloat(form.damage_amount_estimate),
      fault_determination: form.fault_determination,
      police_report_filed: form.police_report_filed,
      policy_coverage_limit: 50000,
      deductible: 500,
      prior_claims_count: 0,
      vehicle_drivable: form.vehicle_drivable,
      airbags_deployed: false,
    };

    try {
      const response = await axios.post(`${API_URL}/process`, payload);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to process claim");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Claim ID *
            </label>
            <input
              type="text"
              name="claim_id"
              value={form.claim_id}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Policy Number *
            </label>
            <input
              type="text"
              name="policy_number"
              value={form.policy_number}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Vehicle Make *
            </label>
            <input
              type="text"
              name="vehicle_make"
              value={form.vehicle_make}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Vehicle Model *
            </label>
            <input
              type="text"
              name="vehicle_model"
              value={form.vehicle_model}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Damage Amount Estimate ($) *
            </label>
            <input
              type="number"
              name="damage_amount_estimate"
              value={form.damage_amount_estimate}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fault Determination *
            </label>
            <select
              name="fault_determination"
              value={form.fault_determination}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="other_party">Other Party</option>
              <option value="policyholder">Policyholder</option>
              <option value="shared">Shared</option>
              <option value="undetermined">Undetermined</option>
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="police_report_filed"
              checked={form.police_report_filed}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            Police Report Filed
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="vehicle_drivable"
              checked={form.vehicle_drivable}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            Vehicle Drivable
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? "Processing..." : "Submit Claim"}
        </button>
      </form>

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
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
          AI is analyzing claim...
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          {/* Triage Decision Banner */}
          <div
            className={`rounded-md border p-4 ${DECISION_COLORS[result.decision]}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium uppercase tracking-wide">
                  Triage Decision
                </span>
                <p className="text-lg font-bold">
                  {DECISION_LABELS[result.decision]}
                </p>
              </div>
              <div className="text-right text-sm">
                <span>
                  Confidence Score: {(result.confidence_score * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Routing Details */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Routing Queue
              </h4>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                {result.queue}
              </p>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Recommended Adjuster
              </h4>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                {result.recommended_adjuster}
              </p>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Estimated Review Time
              </h4>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                {result.estimated_review_time}
              </p>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Estimated Payout Range
              </h4>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                {result.estimated_payout_range || "N/A"}
              </p>
            </div>
          </div>

          {/* Reasoning */}
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <h4 className="text-sm font-semibold text-gray-700">Reasoning</h4>
            <p className="mt-1 text-sm text-gray-600">{result.reasoning}</p>
          </div>

          {/* Fraud Signals */}
          {result.fraud_signals.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <h4 className="text-sm font-semibold text-red-700">
                Fraud Signals
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.fraud_signals.map((signal, i) => (
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

          {/* Next Steps */}
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <h4 className="text-sm font-semibold text-gray-700">Next Steps</h4>
            <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
              {result.next_steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClaimUpload;
