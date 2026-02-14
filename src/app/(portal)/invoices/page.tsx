import { requireManagerAccess } from '@/lib/auth/server-auth';
import PaystubManagementList from '@/components/invoice/PaystubManagementList';

export default async function InvoicesPage() {
  const session = await requireManagerAccess();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Pay Statement Management</h1>
        <div className="text-sm text-muted-foreground">
          {session.user.isAdmin ? 'Admin' : 'Manager'}: {session.user.name}
        </div>
      </div>
      
      <PaystubManagementList isAdmin={session.user.isAdmin} />
    </div>
  );
}
