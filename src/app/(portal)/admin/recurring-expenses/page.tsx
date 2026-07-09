import { requireAuth } from '@/lib/auth/server-auth'
import RecurringExpensesClient from './recurring-expenses-client'

export const metadata = {
  title: 'Recurring Expenses',
  description: 'Manage recurring expense templates that auto-populate on pay statements',
}

export default async function RecurringExpensesPage() {
  await requireAuth('ADMIN')
  return <RecurringExpensesClient />
}
