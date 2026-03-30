import { requireAuth } from '@/lib/auth/server-auth'
import FeatureFlagsClient from './feature-flags-client'

export default async function FeatureFlagsPage() {
  await requireAuth('ADMIN')
  return <FeatureFlagsClient />
}
