import { useState, useEffect } from "react";
import ClaimUpload from "./components/ClaimUpload";
import BatchUpload from "./components/BatchUpload";
import Dashboard from "./components/Dashboard";
import QueueView from "./components/QueueView";

const NAV_ITEMS = [
  { id: "submit-claim", label: "Submit Claim" },
  { id: "batch-upload", label: "Batch Upload" },
  { id: "dashboard", label: "Dashboard" },
  { id: "queues", label: "Queues" },
];

function App() {
  const [dashboardRefreshTrigger, setDashboardRefreshTrigger] = useState(0);
  const [activeSection, setActiveSection] = useState("submit-claim");

  const triggerDashboardRefresh = () => {
    setDashboardRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    function handleScroll() {
      for (const item of NAV_ITEMS) {
        const el = document.getElementById(item.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            setActiveSection(item.id);
            break;
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToSection(sectionId) {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold text-gray-900">
              Insurance Claims Triage
            </h1>
            <p className="text-xs text-gray-500">
              AI-powered claims processing by Tenex
            </p>
          </div>
          <nav className="hidden gap-1 sm:flex">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeSection === item.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          {/* Mobile nav */}
          <div className="sm:hidden">
            <select
              value={activeSection}
              onChange={(e) => scrollToSection(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              {NAV_ITEMS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6">
        {/* Submit Claim */}
        <section id="submit-claim" className="scroll-mt-20 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">Submit Claim</h2>
          <ClaimUpload onClaimProcessed={triggerDashboardRefresh} />
        </section>

        {/* Batch Upload */}
        <section id="batch-upload" className="scroll-mt-20 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-800">Batch Upload</h2>
          <p className="mb-4 text-sm text-gray-500">
            Process multiple claims from CSV file
          </p>
          <BatchUpload />
        </section>

        {/* Dashboard */}
        <section id="dashboard" className="scroll-mt-20 rounded-lg bg-white p-6 shadow">
          <Dashboard refreshTrigger={dashboardRefreshTrigger} />
        </section>

        {/* Queues */}
        <section id="queues" className="scroll-mt-20 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-800">Claims Queues</h2>
          <p className="mb-4 text-sm text-gray-500">
            View and manage claims by triage decision
          </p>
          <QueueView />
        </section>
      </main>
    </div>
  );
}

export default App;
