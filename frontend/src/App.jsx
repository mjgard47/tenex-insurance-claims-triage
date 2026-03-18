import ClaimUpload from "./components/ClaimUpload";

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

        {/* Results Section */}
        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-800">
            Triage Results
          </h2>
          <p className="mt-2 text-gray-500">
            AI decision results will appear here.
          </p>
        </section>

        {/* Dashboard Section */}
        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
          <p className="mt-2 text-gray-500">
            Claims metrics and analytics coming soon.
          </p>
        </section>
      </main>
    </div>
  );
}

export default App;
