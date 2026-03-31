import { requireAuth } from '@/lib/auth/server-auth'
import InvoiceSearchClient from './invoice-search-client'

export default async function InvoiceSearchPage() {
  await requireAuth('ADMIN')
  return <InvoiceSearchClient />
}
