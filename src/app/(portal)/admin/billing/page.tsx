import { requireAdmin } from '@/lib/auth/utils'
import Link from 'next/link'

export default async function AdminBillingDashboard() {
  await requireAdmin()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900">Billing Management</h1>
        <p className="mt-4 text-gray-600">
          Manage subscribers, products, and billing
        </p>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Link
            href="/admin/billing/subscribers"
            className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold">Subscribers</h2>
            <p className="mt-2 text-gray-600">Manage subscriber accounts and subscriptions</p>
          </Link>
          <Link
            href="/admin/billing/products"
            className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold">Products & Pricing</h2>
            <p className="mt-2 text-gray-600">Manage billing products and price plans</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
