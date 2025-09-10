import { redirect } from 'next/navigation'

export default async function AdminDashboard() {
  // Redirect to the new admin layout structure
  redirect('/admin')
}
