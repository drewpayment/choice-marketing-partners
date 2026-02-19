import { requireAdmin } from '@/lib/auth/utils'
import Link from 'next/link'
import { Users, Package } from 'lucide-react'

export default async function AdminBillingDashboard() {
  await requireAdmin()

  return (
    <div className="container mx-auto py-10">
      <div>
        <h1 className="text-3xl font-bold">Billing Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage subscribers, products, and billing
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Link
          href="/admin/billing/subscribers"
          className="group border rounded-lg p-6 hover:shadow-lg transition-shadow hover:border-primary/30"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
              Subscribers
            </h2>
          </div>
          <p className="text-muted-foreground">
            Manage subscriber accounts, view billing status, and assign plans
          </p>
        </Link>

        <Link
          href="/admin/billing/products"
          className="group border rounded-lg p-6 hover:shadow-lg transition-shadow hover:border-primary/30"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
              Products & Pricing
            </h2>
          </div>
          <p className="text-muted-foreground">
            Manage billing products, pricing plans, and Stripe sync
          </p>
        </Link>
      </div>
    </div>
  )
}
