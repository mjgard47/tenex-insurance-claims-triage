import ClaimUpload from "./components/ClaimUpload";
import BatchUpload from "./components/BatchUpload";
import Dashboard from "./components/Dashboard";
import QueueView from "./components/QueueView";

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Insurance Claims Triage
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            AI-powered claims processing by Tenex
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Upload Section */}
        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">Submit Claim</h2>
          <ClaimUpload />
        </section>

        {/* Batch Upload Section */}
        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-800">Batch Upload</h2>
          <p className="mb-4 text-sm text-gray-500">
            Process multiple claims from CSV file
          </p>
          <BatchUpload />
        </section>

        {/* Dashboard Section */}
        <section className="rounded-lg bg-white p-6 shadow">
          <Dashboard />
        </section>
        {/* Queue View Section */}
        <section className="rounded-lg bg-white p-6 shadow">
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
