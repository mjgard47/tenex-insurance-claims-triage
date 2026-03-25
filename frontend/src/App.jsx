import { useState } from "react";
import ClaimUpload from "./components/ClaimUpload";
import BatchUpload from "./components/BatchUpload";
import Dashboard from "./components/Dashboard";
import QueueView from "./components/QueueView";

const PROFILES = [
  "Admin",
  "Junior Adjuster 1",
  "Junior Adjuster 2",
  "Standard Adjuster 1",
  "Standard Adjuster 2",
  "Senior Adjuster 1",
  "Senior Adjuster 2",
];

function App() {
  const [dashboardRefreshTrigger, setDashboardRefreshTrigger] = useState(0);
  const [currentProfile, setCurrentProfile] = useState("Admin");
  const [activeView, setActiveView] = useState("dashboard");
  const [showOnlyMyClaims, setShowOnlyMyClaims] = useState(false);

  const isAdmin = currentProfile === "Admin";

  const triggerDashboardRefresh = () => {
    setDashboardRefreshTrigger((prev) => prev + 1);
  };

  function handleProfileChange(e) {
    const newProfile = e.target.value;
    setCurrentProfile(newProfile);
    setShowOnlyMyClaims(newProfile !== "Admin");
    setActiveView(newProfile === "Admin" ? "dashboard" : "queues");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-gray-200 shadow-sm"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <h1
                className="text-xl font-bold"
                style={{ color: "#1E3A5F" }}
              >
                Insurance Claims Triage
              </h1>
              <p className="text-xs text-gray-500">
                AI-powered claims processing by Tenex
              </p>
            </div>
            <div className="hidden border-l border-gray-300 pl-4 sm:flex sm:items-center sm:gap-2">
              <label className="text-xs text-gray-500">Viewing as:</label>
              <select
                value={currentProfile}
                onChange={handleProfileChange}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm font-medium text-gray-900 focus:outline-none"
              >
                {PROFILES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden gap-1 sm:flex">
            {isAdmin ? (
              <>
                <NavBtn
                  label="Dashboard"
                  active={activeView === "dashboard"}
                  onClick={() => setActiveView("dashboard")}
                />
                <NavBtn
                  label="All Claims"
                  active={activeView === "queues"}
                  onClick={() => setActiveView("queues")}
                />
                <NavBtn
                  label="Batch Upload"
                  active={activeView === "batch"}
                  onClick={() => setActiveView("batch")}
                />
                <button
                  type="button"
                  onClick={() => setActiveView("submit")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeView === "submit"
                      ? "text-white"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  }`}
                  style={
                    activeView === "submit"
                      ? { backgroundColor: "#1E3A5F" }
                      : {}
                  }
                >
                  + Submit Claim
                </button>
              </>
            ) : (
              <>
                <NavBtn
                  label="My Queue"
                  active={activeView === "queues"}
                  onClick={() => setActiveView("queues")}
                />
                <NavBtn
                  label="My Performance"
                  active={activeView === "dashboard"}
                  onClick={() => setActiveView("dashboard")}
                />
              </>
            )}
          </nav>

          {/* Mobile nav */}
          <div className="flex gap-2 sm:hidden">
            <select
              value={currentProfile}
              onChange={handleProfileChange}
              className="rounded-md border border-gray-300 px-1 py-1 text-xs"
            >
              {PROFILES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={activeView}
              onChange={(e) => setActiveView(e.target.value)}
              className="rounded-md border border-gray-300 px-1 py-1 text-xs"
            >
              {isAdmin ? (
                <>
                  <option value="dashboard">Dashboard</option>
                  <option value="queues">All Claims</option>
                  <option value="batch">Batch Upload</option>
                  <option value="submit">Submit Claim</option>
                </>
              ) : (
                <>
                  <option value="queues">My Queue</option>
                  <option value="dashboard">My Performance</option>
                </>
              )}
            </select>
          </div>
        </div>
      </header>

      {/* Main Content — single view at a time */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {activeView === "dashboard" && (
          <section className="rounded-lg bg-white p-6 shadow">
            <Dashboard
              refreshTrigger={dashboardRefreshTrigger}
              currentProfile={currentProfile}
            />
          </section>
        )}

        {activeView === "queues" && (
          <section className="rounded-lg bg-white p-6 shadow">
            <QueueView
              currentProfile={currentProfile}
              showOnlyMyClaims={showOnlyMyClaims}
              setShowOnlyMyClaims={setShowOnlyMyClaims}
              onClaimUpdated={triggerDashboardRefresh}
            />
          </section>
        )}

        {activeView === "batch" && isAdmin && (
          <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-800">
              Batch Upload
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Process multiple claims from CSV file
            </p>
            <BatchUpload />
          </section>
        )}

        {activeView === "submit" && isAdmin && (
          <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">
              Submit Claim
            </h2>
            <ClaimUpload onClaimProcessed={triggerDashboardRefresh} />
          </section>
        )}
      </main>
    </div>
  );
}

function NavBtn({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? "text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
      style={active ? { backgroundColor: "#1E3A5F" } : {}}
    >
      {label}
    </button>
  );
}

export default App;
