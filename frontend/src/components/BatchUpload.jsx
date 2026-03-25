import { useState } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

function generateSampleCSV() {
  const headers = [
    "claim_id",
    "submission_date",
    "policy_number",
    "policyholder_name",
    "vehicle_year",
    "vehicle_make",
    "vehicle_model",
    "vehicle_vin",
    "vehicle_mileage",
    "date_of_incident",
    "time_of_incident",
    "location_address",
    "collision_type",
    "damage_description",
    "damage_amount_estimate",
    "fault_determination",
    "police_report_filed",
    "policy_coverage_limit",
    "deductible",
    "prior_claims_count",
    "vehicle_drivable",
    "airbags_deployed",
  ];

  const rows = [
    [
      "CLM-SAMPLE-001", "2024-03-15", "POL-123456", "John Smith",
      "2019", "Honda", "Accord", "1HGBH41JXMN109186", "45000",
      "2024-03-14", "14:30", "123 Main St San Francisco CA 94102",
      "rear_end", "Rear bumper damage and minor dent", "3200",
      "other_party", "true", "50000", "500", "0", "true", "false",
    ],
    [
      "CLM-SAMPLE-002", "2024-03-16", "POL-789012", "Sarah Johnson",
      "2021", "Toyota", "Camry", "4T1B11HK5MU123456", "22000",
      "2024-03-15", "09:15", "456 Oak Ave Oakland CA 94612",
      "side_impact", "Driver side door damaged in T-bone collision", "6500",
      "shared", "true", "100000", "1000", "1", "true", "false",
    ],
    [
      "CLM-SAMPLE-003", "2024-03-17", "POL-345678", "Michael Chen",
      "2018", "Ford", "F-150", "1FTFW1ET5JKE12345", "85000",
      "2024-03-16", "18:45", "789 Pine St Berkeley CA 94704",
      "single_vehicle", "Front end collision with tree", "12000",
      "policyholder", "true", "75000", "500", "2", "false", "true",
    ],
  ];

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function handleDownloadSample() {
  const csv = generateSampleCSV();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "claims_batch_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function BatchUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [showErrors, setShowErrors] = useState(false);

  function handleFileChange(e) {
    setFile(e.target.files[0] || null);
    setResults(null);
    setError(null);
  }

  function handleClear() {
    setFile(null);
    setResults(null);
    setError(null);
    setShowErrors(false);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setResults(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API_URL}/process_batch`, formData);
      setResults(response.data);
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.detail || "Server error during processing");
      } else {
        setError("Failed to connect to server");
      }
    } finally {
      setUploading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setResults(null);
    setError(null);
    setShowErrors(false);
  }

  return (
    <div>
      {/* File Upload Interface */}
      {!results && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadSample}
              className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <span>&#8595;</span>
              Download Sample CSV Template
            </button>
            <span className="text-xs text-gray-400">
              3 example claims with correct column format
            </span>
          </div>

          <details className="mb-4 rounded-md border border-gray-200 p-3">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
              View Required Columns (22 fields)
            </summary>
            <div className="mt-3 space-y-2 text-xs text-gray-600">
              <p className="font-semibold text-gray-700">Required text fields:</p>
              <ul className="list-disc space-y-0.5 pl-5">
                <li>claim_id — Unique identifier (e.g. CLM-2024-001)</li>
                <li>policyholder_name — Full name</li>
                <li>policy_number — Policy ID (e.g. POL-449283)</li>
                <li>vehicle_make, vehicle_model, vehicle_vin</li>
                <li>location_address — Incident location</li>
                <li>damage_description — Description of damage</li>
              </ul>
              <p className="font-semibold text-gray-700">Date/time fields (YYYY-MM-DD / HH:MM):</p>
              <ul className="list-disc space-y-0.5 pl-5">
                <li>submission_date — e.g. 2024-03-15</li>
                <li>date_of_incident — e.g. 2024-03-14</li>
                <li>time_of_incident — e.g. 14:30</li>
              </ul>
              <p className="font-semibold text-gray-700">Numeric fields:</p>
              <ul className="list-disc space-y-0.5 pl-5">
                <li>vehicle_year, vehicle_mileage, prior_claims_count</li>
                <li>damage_amount_estimate — Dollar amount, no $ sign</li>
                <li>policy_coverage_limit, deductible</li>
              </ul>
              <p className="font-semibold text-gray-700">Enum fields:</p>
              <ul className="list-disc space-y-0.5 pl-5">
                <li>collision_type — rear_end, head_on, side_impact, rollover, single_vehicle, multi_vehicle, sideswipe, hit_and_run, intersection</li>
                <li>fault_determination — other_party, policyholder, shared, undetermined</li>
              </ul>
              <p className="font-semibold text-gray-700">Boolean fields (true/false):</p>
              <ul className="list-disc space-y-0.5 pl-5">
                <li>police_report_filed, vehicle_drivable, airbags_deployed</li>
              </ul>
            </div>
          </details>

          <p className="mb-4 text-sm text-gray-500">
            Upload CSV with multiple claims (max 1,000 rows)
          </p>

          <div className="flex items-center gap-4">
            <label className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
              Choose File
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <span className="text-sm text-gray-500">
              {file ? file.name : "No file selected"}
            </span>

            {file && (
              <button
                type="button"
                onClick={handleClear}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
          >
            {uploading ? "Processing..." : "Upload & Process"}
          </button>
        </div>
      )}

      {/* Loading State */}
      {uploading && (
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
          Processing claims...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Summary Card */}
          <div className="rounded-md border border-green-300 bg-green-50 p-6">
            <h4 className="text-lg font-bold text-green-800">
              Batch Processing Complete
            </h4>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-green-600">Total Uploaded</p>
                <p className="text-2xl font-bold text-green-800">
                  {results.total_uploaded}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-600">Processed</p>
                <p className="text-2xl font-bold text-green-800">
                  {results.processed}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-600">Skipped</p>
                <p
                  className={`text-2xl font-bold ${results.skipped > 0 ? "text-red-600" : "text-green-800"}`}
                >
                  {results.skipped}
                </p>
              </div>
            </div>
          </div>

          {/* Queue Distribution */}
          <div className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
            <h4 className="mb-3 text-sm font-semibold text-gray-700">
              Claims Routed To Queues
            </h4>
            <div className="flex flex-wrap gap-3">
              <span className="inline-block rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
                Fast-Track: {results.summary.fast_track}
              </span>
              <span className="inline-block rounded-full bg-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-800">
                Standard Review: {results.summary.standard_review}
              </span>
              <span className="inline-block rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-800">
                Senior: {results.summary.escalation}
              </span>
            </div>
          </div>

          {/* Error Details (Collapsible) */}
          {results.errors.length > 0 && (
            <div className="rounded-md border border-red-300 bg-red-50">
              <button
                type="button"
                onClick={() => setShowErrors(!showErrors)}
                className="flex w-full items-center justify-between p-4 text-left text-sm font-semibold text-red-700"
              >
                <span>Errors ({results.errors.length})</span>
                <span>{showErrors ? "Hide" : "Show"}</span>
              </button>
              {showErrors && (
                <ul className="border-t border-red-200 px-4 pb-4 pt-2">
                  {results.errors.map((err, i) => (
                    <li key={i} className="py-1 text-sm text-red-600">
                      Row {err.row}: {err.claim_id} — {err.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Next Steps */}
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <h4 className="text-sm font-semibold text-gray-700">Next Steps</h4>
            <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
              <li>Claims have been saved to database</li>
              <li>View Dashboard to see updated metrics</li>
            </ul>
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              Upload Another Batch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BatchUpload;
