import { requireAuth } from '@/lib/auth/server-auth'
import VendorsClient from './vendors-client'

export default async function VendorsPage() {
  await requireAuth('ADMIN')
  return <VendorsClient />
}
