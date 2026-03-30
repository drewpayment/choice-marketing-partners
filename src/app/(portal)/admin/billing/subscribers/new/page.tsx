import { requireAuth } from '@/lib/auth/server-auth'
import NewSubscriberClient from './new-subscriber-client'

export default async function NewSubscriberPage() {
  await requireAuth('ADMIN')
  return <NewSubscriberClient />
}
