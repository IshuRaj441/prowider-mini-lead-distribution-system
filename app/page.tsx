import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Prowider Lead Distribution
          </h1>
          <p className="text-xl text-gray-600">
            Enterprise-grade lead allocation system
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Link
            href="/request-service"
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Request Service
            </h2>
            <p className="text-gray-600">
              Submit a service request and get automatically assigned to providers
            </p>
          </Link>

          <Link
            href="/dashboard"
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Provider Dashboard
            </h2>
            <p className="text-gray-600">
              View provider quotas, assigned leads, and real-time updates
            </p>
          </Link>

          <Link
            href="/test-tools"
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Test Tools
            </h2>
            <p className="text-gray-600">
              Test concurrency, webhook idempotency, and stress allocation logic
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
