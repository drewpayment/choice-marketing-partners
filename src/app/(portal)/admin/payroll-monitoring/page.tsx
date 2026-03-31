import { requireAuth } from '@/lib/auth/server-auth'
import PayrollMonitoringClient from './payroll-monitoring-client'

export default async function PayrollMonitoringPage() {
  await requireAuth('ADMIN')
  return <PayrollMonitoringClient />
}
