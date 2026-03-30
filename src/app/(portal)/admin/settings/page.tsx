import { requireAuth } from '@/lib/auth/server-auth'
import SettingsClient from './settings-client'

export default async function SettingsPage() {
  await requireAuth('ADMIN')
  return <SettingsClient />
}
