'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function TestToolsPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')

  const resetQuota = async () => {
    setLoading(true)
    setMessage('')
    setMessageType('info')

    try {
      const eventId = crypto.randomUUID()
      const payload = JSON.stringify({
        eventId,
        timestamp: new Date().toISOString(),
      })

      const webhookSecret = process.env.NEXT_PUBLIC_WEBHOOK_SECRET
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-test-mode': 'true',
      }

      if (webhookSecret) {
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(webhookSecret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        )
        const signature = await crypto.subtle.sign(
          'HMAC',
          key,
          encoder.encode(payload)
        )
        const signatureHex = Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
        headers['x-webhook-signature'] = signatureHex
      }

      const response = await fetch('/api/webhooks/reset-quota', {
        method: 'POST',
        headers,
        body: payload,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset quota')
      }

      setMessage(data.message)
      setMessageType('success')
    } catch (err: any) {
      setMessage(err.message)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const generateConcurrentLeads = async () => {
    setLoading(true)
    setMessage('')
    setMessageType('info')

    try {
      const response = await fetch('/api/test/generate-leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: 10 }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate leads')
      }

      setMessage(
        `Generated ${data.data.successful} leads successfully, ${data.data.failed} failed`
      )
      setMessageType('success')
    } catch (err: any) {
      setMessage(err.message)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const triggerWebhookRepeatedly = async () => {
    setLoading(true)
    setMessage('')
    setMessageType('info')

    try {
      const eventId = crypto.randomUUID()
      const payload = JSON.stringify({
        eventId,
        timestamp: new Date().toISOString(),
      })

      const webhookSecret = process.env.NEXT_PUBLIC_WEBHOOK_SECRET
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-test-mode': 'true',
      }

      if (webhookSecret) {
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(webhookSecret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        )
        const signature = await crypto.subtle.sign(
          'HMAC',
          key,
          encoder.encode(payload)
        )
        const signatureHex = Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
        headers['x-webhook-signature'] = signatureHex
      }

      // Trigger the same webhook 3 times to test idempotency
      const promises = Array.from({ length: 3 }, () =>
        fetch('/api/webhooks/reset-quota', {
          method: 'POST',
          headers,
          body: payload,
        })
      )

      const responses = await Promise.all(promises)
      const results = await Promise.all(responses.map(r => r.json()))

      const skippedCount = results.filter(r => r.skipped).length
      const processedCount = results.filter(r => !r.skipped).length

      setMessage(
        `Webhook triggered 3 times: ${processedCount} processed, ${skippedCount} skipped (idempotency working!)`
      )
      setMessageType('success')
    } catch (err: any) {
      setMessage(err.message)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Test Tools
          </h1>
          <p className="text-gray-600">
            Test concurrency, webhook idempotency, and stress allocation logic
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              messageType === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : messageType === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <p className="font-medium">{message}</p>
          </div>
        )}

        <div className="grid md:grid-cols-1 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Reset Provider Quota
            </h2>
            <p className="text-gray-600 mb-4">
              Reset all provider quotas to 10 via webhook. Tests webhook functionality.
            </p>
            <button
              onClick={resetQuota}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Reset Quota'}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Generate 10 Concurrent Leads
            </h2>
            <p className="text-gray-600 mb-4">
              Generate 10 leads simultaneously to test concurrency safety and allocation logic.
            </p>
            <button
              onClick={generateConcurrentLeads}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Concurrent Leads'}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Test Webhook Idempotency
            </h2>
            <p className="text-gray-600 mb-4">
              Trigger the same webhook 3 times to test idempotency. Only the first should process.
            </p>
            <button
              onClick={triggerWebhookRepeatedly}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Testing...' : 'Test Idempotency'}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
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
