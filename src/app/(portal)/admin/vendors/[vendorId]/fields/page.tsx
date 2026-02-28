import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import VendorFieldManager from '@/components/vendor-fields/VendorFieldManager'
import { VendorRepository } from '@/lib/repositories/VendorRepository'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ vendorId: string }>
}

export default async function VendorFieldsPage({ params }: PageProps) {
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
