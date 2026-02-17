import { requireSubscriber } from '@/lib/auth/utils'

export default async function PaymentsPage() {
  const session = await requireSubscriber()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
        <p className="mt-4 text-gray-600">
          View your payment history
        </p>
        <div className="mt-8">
          <p className="text-gray-500">
            Payment history table - UI pending
          </p>
        </div>
      </div>
    </div>
  )
}
