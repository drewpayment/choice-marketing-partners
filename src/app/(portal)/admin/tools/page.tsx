import { requireAuth } from '@/lib/auth/server-auth'
import ToolsClient from './tools-client'

export default async function ToolsPage() {
  await requireAuth('ADMIN')
  return <ToolsClient />
}
