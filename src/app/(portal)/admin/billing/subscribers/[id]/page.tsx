import { requireAuth } from '@/lib/auth/server-auth'
import SubscriberDetailClient from './subscriber-detail-client'

export default async function SubscriberDetailPage() {
  await requireAuth('ADMIN')
  return <SubscriberDetailClient />
}
