import { useState } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

const INPUT = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const LABEL = "block text-sm font-medium text-gray-700";
const SECTION = "rounded-md border border-gray-200 bg-gray-50 p-4";

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
    submission_date: "",
    policy_number: "",
    policyholder_name: "",
    vehicle_year: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_vin: "",
    vehicle_mileage: "",
    date_of_incident: "",
    time_of_incident: "",
    location_address: "",
    collision_type: "rear_end",
    damage_description: "",
    damage_amount_estimate: "",
    fault_determination: "other_party",
    police_report_filed: false,
    policy_coverage_limit: "",
    deductible: "",
    prior_claims_count: "0",
    vehicle_drivable: true,
    airbags_deployed: false,
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
      ...form,
      vehicle_year: parseInt(form.vehicle_year, 10),
      vehicle_mileage: parseInt(form.vehicle_mileage, 10),
      damage_amount_estimate: parseFloat(form.damage_amount_estimate),
      policy_coverage_limit: parseFloat(form.policy_coverage_limit),
      deductible: parseFloat(form.deductible),
      prior_claims_count: parseInt(form.prior_claims_count, 10),
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
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Policyholder & Policy */}
        <div className={SECTION}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            1. Policyholder & Policy
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={LABEL}>Claim ID</label>
              <input type="text" name="claim_id" value={form.claim_id} onChange={handleChange} required placeholder="CLM-2024-001" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Policyholder Name</label>
              <input type="text" name="policyholder_name" value={form.policyholder_name} onChange={handleChange} required placeholder="Sarah Mitchell" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Policy Number</label>
              <input type="text" name="policy_number" value={form.policy_number} onChange={handleChange} required placeholder="POL-449283" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Submission Date</label>
              <input type="date" name="submission_date" value={form.submission_date} onChange={handleChange} required className={INPUT} />
            </div>
          </div>
        </div>

        {/* 2. Vehicle Information */}
        <div className={SECTION}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            2. Vehicle Information
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={LABEL}>Year</label>
              <input type="number" name="vehicle_year" value={form.vehicle_year} onChange={handleChange} required min="1990" max="2030" placeholder="2019" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Make</label>
              <input type="text" name="vehicle_make" value={form.vehicle_make} onChange={handleChange} required placeholder="Honda" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Model</label>
              <input type="text" name="vehicle_model" value={form.vehicle_model} onChange={handleChange} required placeholder="Accord" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Mileage</label>
              <input type="number" name="vehicle_mileage" value={form.vehicle_mileage} onChange={handleChange} required min="0" placeholder="45000" className={INPUT} />
            </div>
            <div className="lg:col-span-2">
              <label className={LABEL}>VIN</label>
              <input type="text" name="vehicle_vin" value={form.vehicle_vin} onChange={handleChange} required placeholder="1HGCV1F39KA123456" className={INPUT} />
            </div>
            <div className="flex items-end gap-6 lg:col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="vehicle_drivable" checked={form.vehicle_drivable} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                Vehicle Drivable
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="airbags_deployed" checked={form.airbags_deployed} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                Airbags Deployed
              </label>
            </div>
          </div>
        </div>

        {/* 3. Incident Details */}
        <div className={SECTION}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            3. Incident Details
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={LABEL}>Date of Incident</label>
              <input type="date" name="date_of_incident" value={form.date_of_incident} onChange={handleChange} required className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Time of Incident</label>
              <input type="time" name="time_of_incident" value={form.time_of_incident} onChange={handleChange} required className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Collision Type</label>
              <select name="collision_type" value={form.collision_type} onChange={handleChange} required className={INPUT}>
                <option value="rear_end">Rear End</option>
                <option value="head_on">Head On</option>
                <option value="side_impact">Side Impact</option>
                <option value="rollover">Rollover</option>
                <option value="single_vehicle">Single Vehicle</option>
                <option value="multi_vehicle">Multi Vehicle</option>
                <option value="sideswipe">Sideswipe</option>
                <option value="hit_and_run">Hit and Run</option>
                <option value="intersection">Intersection</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Fault Determination</label>
              <select name="fault_determination" value={form.fault_determination} onChange={handleChange} required className={INPUT}>
                <option value="other_party">Other Party</option>
                <option value="policyholder">Policyholder</option>
                <option value="shared">Shared</option>
                <option value="undetermined">Undetermined</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className={LABEL}>Location Address</label>
              <input type="text" name="location_address" value={form.location_address} onChange={handleChange} required placeholder="1250 Market St, San Francisco, CA 94102" className={INPUT} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className={LABEL}>Damage Description</label>
              <textarea name="damage_description" value={form.damage_description} onChange={handleChange} required rows="2" placeholder="Rear bumper damage, tail light broken, minor trunk dent from being rear-ended at stoplight" className={INPUT} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="police_report_filed" checked={form.police_report_filed} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                Police Report Filed
              </label>
            </div>
          </div>
        </div>

        {/* 4. Coverage & Financials */}
        <div className={SECTION}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            4. Coverage & Financials
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={LABEL}>Damage Estimate ($)</label>
              <input type="number" name="damage_amount_estimate" value={form.damage_amount_estimate} onChange={handleChange} required min="0" step="0.01" placeholder="3200" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Coverage Limit ($)</label>
              <input type="number" name="policy_coverage_limit" value={form.policy_coverage_limit} onChange={handleChange} required min="0" step="0.01" placeholder="50000" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Deductible ($)</label>
              <input type="number" name="deductible" value={form.deductible} onChange={handleChange} required min="0" step="0.01" placeholder="500" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Prior Claims Count</label>
              <input type="number" name="prior_claims_count" value={form.prior_claims_count} onChange={handleChange} required min="0" className={INPUT} />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300 sm:w-auto"
        >
          {loading ? "Processing..." : "Submit Claim for Triage"}
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
