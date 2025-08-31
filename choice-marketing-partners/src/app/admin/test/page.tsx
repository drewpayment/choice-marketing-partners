import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

export default async function AdminTestPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.isAdmin) {
    redirect('/forbidden')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Admin Test Page
        </h1>
        <p className="text-gray-600 mb-4">
          This is a test page that requires admin privileges to access.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-800">
            ✅ You have admin access!
          </p>
          <p className="text-sm text-green-600 mt-1">
            User: {session.user?.name} ({session.user?.email})
          </p>
        </div>
      </div>
    </div>
  )
}
