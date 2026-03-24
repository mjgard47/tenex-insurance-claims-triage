import { useState } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

const INPUT = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const INPUT_ERROR = "mt-1 block w-full rounded-md border-2 border-red-500 bg-red-50 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500";
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

function validateForm(form) {
  const errors = [];

  if (!form.claim_id?.trim()) {
    errors.push({ field: "claim_id", message: "Claim ID is required" });
  }
  if (!form.policyholder_name?.trim()) {
    errors.push({ field: "policyholder_name", message: "Policyholder name is required" });
  }
  if (!form.policy_number?.trim()) {
    errors.push({ field: "policy_number", message: "Policy number is required" });
  }
  if (!form.submission_date) {
    errors.push({ field: "submission_date", message: "Submission date is required" });
  }
  if (!form.vehicle_make?.trim()) {
    errors.push({ field: "vehicle_make", message: "Vehicle make is required" });
  }
  if (!form.vehicle_model?.trim()) {
    errors.push({ field: "vehicle_model", message: "Vehicle model is required" });
  }
  if (!form.vehicle_vin?.trim()) {
    errors.push({ field: "vehicle_vin", message: "VIN is required" });
  }
  if (!form.date_of_incident) {
    errors.push({ field: "date_of_incident", message: "Date of incident is required" });
  }
  if (!form.time_of_incident) {
    errors.push({ field: "time_of_incident", message: "Time of incident is required" });
  }
  if (!form.location_address?.trim()) {
    errors.push({ field: "location_address", message: "Location address is required" });
  }
  if (!form.damage_description?.trim()) {
    errors.push({ field: "damage_description", message: "Damage description is required" });
  }

  const year = parseInt(form.vehicle_year, 10);
  if (!form.vehicle_year || isNaN(year) || year < 1990 || year > 2030) {
    errors.push({ field: "vehicle_year", message: "Vehicle year must be between 1990 and 2030" });
  }

  const mileage = parseInt(form.vehicle_mileage, 10);
  if (!form.vehicle_mileage || isNaN(mileage) || mileage < 0) {
    errors.push({ field: "vehicle_mileage", message: "Mileage is required" });
  }

  const damage = parseFloat(form.damage_amount_estimate);
  if (isNaN(damage) || damage <= 0) {
    errors.push({ field: "damage_amount_estimate", message: "Damage estimate must be greater than $0" });
  }

  const coverage = parseFloat(form.policy_coverage_limit);
  if (isNaN(coverage) || coverage <= 0) {
    errors.push({ field: "policy_coverage_limit", message: "Coverage limit must be greater than $0" });
  }

  const deductible = parseFloat(form.deductible);
  if (isNaN(deductible) || deductible < 0) {
    errors.push({ field: "deductible", message: "Deductible is required" });
  }

  return errors;
}

function ClaimUpload({ onClaimProcessed }) {
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
  const [validationErrors, setValidationErrors] = useState([]);

  function hasError(fieldName) {
    return validationErrors.some((e) => e.field === fieldName);
  }

  function inputClass(fieldName) {
    return hasError(fieldName) ? INPUT_ERROR : INPUT;
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setValidationErrors((prev) => prev.filter((err) => err.field !== name));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const errors = validateForm(form);
    if (errors.length > 0) {
      setValidationErrors(errors);
      document.querySelector("#validation-errors")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    setValidationErrors([]);
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
      setValidationErrors([]);
      if (onClaimProcessed) {
        onClaimProcessed();
      }
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
              <input type="text" name="claim_id" value={form.claim_id} onChange={handleChange} placeholder="CLM-2024-001" className={inputClass("claim_id")} />
            </div>
            <div>
              <label className={LABEL}>Policyholder Name</label>
              <input type="text" name="policyholder_name" value={form.policyholder_name} onChange={handleChange} placeholder="Sarah Mitchell" className={inputClass("policyholder_name")} />
            </div>
            <div>
              <label className={LABEL}>Policy Number</label>
              <input type="text" name="policy_number" value={form.policy_number} onChange={handleChange} placeholder="POL-449283" className={inputClass("policy_number")} />
            </div>
            <div>
              <label className={LABEL}>Submission Date</label>
              <input type="date" name="submission_date" value={form.submission_date} onChange={handleChange} className={inputClass("submission_date")} />
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
              <input type="number" name="vehicle_year" value={form.vehicle_year} onChange={handleChange} min="1990" max="2030" placeholder="2019" className={inputClass("vehicle_year")} />
            </div>
            <div>
              <label className={LABEL}>Make</label>
              <input type="text" name="vehicle_make" value={form.vehicle_make} onChange={handleChange} placeholder="Honda" className={inputClass("vehicle_make")} />
            </div>
            <div>
              <label className={LABEL}>Model</label>
              <input type="text" name="vehicle_model" value={form.vehicle_model} onChange={handleChange} placeholder="Accord" className={inputClass("vehicle_model")} />
            </div>
            <div>
              <label className={LABEL}>Mileage</label>
              <input type="number" name="vehicle_mileage" value={form.vehicle_mileage} onChange={handleChange} min="0" placeholder="45000" className={inputClass("vehicle_mileage")} />
            </div>
            <div className="lg:col-span-2">
              <label className={LABEL}>VIN</label>
              <input type="text" name="vehicle_vin" value={form.vehicle_vin} onChange={handleChange} placeholder="1HGCV1F39KA123456" className={inputClass("vehicle_vin")} />
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
              <input type="date" name="date_of_incident" value={form.date_of_incident} onChange={handleChange} className={inputClass("date_of_incident")} />
            </div>
            <div>
              <label className={LABEL}>Time of Incident</label>
              <input type="time" name="time_of_incident" value={form.time_of_incident} onChange={handleChange} className={inputClass("time_of_incident")} />
            </div>
            <div>
              <label className={LABEL}>Collision Type</label>
              <select name="collision_type" value={form.collision_type} onChange={handleChange} className={INPUT}>
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
              <select name="fault_determination" value={form.fault_determination} onChange={handleChange} className={INPUT}>
                <option value="other_party">Other Party</option>
                <option value="policyholder">Policyholder</option>
                <option value="shared">Shared</option>
                <option value="undetermined">Undetermined</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className={LABEL}>Location Address</label>
              <input type="text" name="location_address" value={form.location_address} onChange={handleChange} placeholder="1250 Market St, San Francisco, CA 94102" className={inputClass("location_address")} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className={LABEL}>Damage Description</label>
              <textarea name="damage_description" value={form.damage_description} onChange={handleChange} rows="2" placeholder="Rear bumper damage, tail light broken, minor trunk dent from being rear-ended at stoplight" className={inputClass("damage_description")} />
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
              <input type="number" name="damage_amount_estimate" value={form.damage_amount_estimate} onChange={handleChange} min="0" step="0.01" placeholder="3200" className={inputClass("damage_amount_estimate")} />
            </div>
            <div>
              <label className={LABEL}>Coverage Limit ($)</label>
              <input type="number" name="policy_coverage_limit" value={form.policy_coverage_limit} onChange={handleChange} min="0" step="0.01" placeholder="50000" className={inputClass("policy_coverage_limit")} />
            </div>
            <div>
              <label className={LABEL}>Deductible ($)</label>
              <input type="number" name="deductible" value={form.deductible} onChange={handleChange} min="0" step="0.01" placeholder="500" className={inputClass("deductible")} />
            </div>
            <div>
              <label className={LABEL}>Prior Claims Count</label>
              <input type="number" name="prior_claims_count" value={form.prior_claims_count} onChange={handleChange} min="0" className={INPUT} />
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div
            id="validation-errors"
            className="rounded-md border-2 border-red-300 bg-red-50 p-4"
          >
            <h3 className="mb-2 text-sm font-semibold text-red-800">
              Please fix the following errors:
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
              {validationErrors.map((err, i) => (
                <li key={i}>{err.message}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin text-white"
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
              Processing...
            </span>
          ) : (
            "Submit Claim for Triage"
          )}
        </button>
      </form>

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

          {/* Decision Breakdown */}
          {result.criteria_checks && result.criteria_checks.length > 0 && (
            <div className="rounded-md border border-gray-200 p-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">
                Decision Breakdown
              </h4>
              <div className="space-y-2">
                {result.criteria_checks.map((check, i) => (
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
              {result.payout_calculation && (
                <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                    Payout Calculation
                  </p>
                  <div className="mt-2 space-y-1 font-mono text-sm text-green-800">
                    <p>
                      Damage estimate:{" "}
                      <span className="font-semibold">
                        ${result.payout_calculation.damage_estimate.toLocaleString()}
                      </span>
                    </p>
                    <p>
                      Minus deductible:{" "}
                      <span className="font-semibold">
                        -${result.payout_calculation.deductible.toLocaleString()}
                      </span>
                    </p>
                    <div className="border-t border-green-300 pt-1">
                      <p>
                        Recommended payout:{" "}
                        <span className="text-base font-bold">
                          ${result.payout_calculation.recommended_payout.toLocaleString()}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
