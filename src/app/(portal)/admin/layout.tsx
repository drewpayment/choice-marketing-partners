import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/config';
import { AdminLayoutProvider } from '@/contexts/AdminLayoutContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminMainContent from '@/components/admin/AdminMainContent';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  // Check if user is admin
  const isAdmin = session?.user?.isAdmin;
  
  if (!isAdmin) {
    redirect('/dashboard');
  }

  return (
    <AdminLayoutProvider>
      <div className="bg-background">
        <AdminSidebar />
        <AdminMainContent>
          {children}
        </AdminMainContent>
      </div>
    </AdminLayoutProvider>
  );
}
