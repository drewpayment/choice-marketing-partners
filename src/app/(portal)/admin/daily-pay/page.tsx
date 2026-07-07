import { requireAuth } from '@/lib/auth/server-auth'
import DailyPayClient from './daily-pay-client'

export const metadata = {
  title: 'Daily Pay Entry',
  description: 'Record daily pay (advances) paid to agents against upcoming statements',
}

export default async function DailyPayPage() {
  await requireAuth('ADMIN')
  return <DailyPayClient />
}
