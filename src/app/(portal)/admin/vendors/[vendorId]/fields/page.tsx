import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import VendorFieldManager from '@/components/vendor-fields/VendorFieldManager'
import { VendorRepository } from '@/lib/repositories/VendorRepository'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { notFound, redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ vendorId: string }>
}

export default async function VendorFieldsPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  const flagEnabled = await isFeatureEnabled('vendor_custom_fields', {
    userId: session?.user?.id ?? 'anonymous',
    isAdmin: session?.user?.isAdmin ?? false,
    isManager: session?.user?.isManager ?? false,
    isSubscriber: false,
    subscriberId: null,
  })
  if (!flagEnabled) redirect('/admin/vendors')

  const { vendorId: vendorIdStr } = await params
  const vendorId = parseInt(vendorIdStr)

  if (isNaN(vendorId)) notFound()

  const vendorRepo = new VendorRepository()
  const vendor = await vendorRepo.getVendorById(vendorId)

  if (!vendor) notFound()

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Link href="/admin/vendors">
          <Button variant="ghost" size="sm" className="-ml-2 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Vendors
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Configure Paystub Fields</h1>
        <p className="text-muted-foreground mt-1">
          Manage which columns appear on paystubs for <strong>{vendor.name}</strong>
        </p>
      </div>
      <VendorFieldManager vendorId={vendorId} vendorName={vendor.name} />
    </div>
  )
}
