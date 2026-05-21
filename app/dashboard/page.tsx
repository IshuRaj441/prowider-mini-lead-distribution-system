'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Provider {
  id: number
  name: string
  monthlyQuota: number
  remainingQuota: number
  leadsReceived: number
  leadAssignments: Array<{
    lead: {
      id: number
      customerName: string
      phoneNumber: string
      city: string
      description: string
      service: {
        name: string
      }
    }
    assignedAt: string
  }>
}

export default function DashboardPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/providers')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch providers')
      }

      setProviders(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProviders()

    // Set up SSE for real-time updates
    const eventSource = new EventSource('/api/events')

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (
        data.type === 'lead-created' ||
        data.type === 'quota-reset' ||
        data.type === 'bulk-leads-created'
      ) {
        fetchProviders()
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Provider Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time view of provider quotas and assigned leads
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={`bg-white rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow ${
                selectedProvider?.id === provider.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedProvider(provider)}
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {provider.name}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Monthly Quota</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {provider.monthlyQuota}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Remaining</p>
                  <p
                    className={`text-2xl font-bold ${
                      provider.remainingQuota > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {provider.remainingQuota}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Leads Received</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {provider.leadsReceived}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedProvider && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {selectedProvider.name} - Assigned Leads
            </h2>
            {selectedProvider.leadAssignments.length === 0 ? (
              <p className="text-gray-600">No leads assigned yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Customer
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Phone
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        City
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Service
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Assigned At
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProvider.leadAssignments.map((assignment) => (
                      <tr
                        key={assignment.lead.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {assignment.lead.customerName}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {assignment.lead.phoneNumber}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {assignment.lead.city}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {assignment.lead.service.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(assignment.assignedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="text-center">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
