import { requireAuth } from '@/lib/auth/server-auth'
import SubscribersClient from './subscribers-client'

export default async function SubscribersPage() {
  await requireAuth('ADMIN')
  return <SubscribersClient />
}
