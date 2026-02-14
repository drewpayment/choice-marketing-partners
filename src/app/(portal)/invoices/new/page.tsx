import { requireManagerAccess } from '@/lib/auth/server-auth';
import InvoiceEditor from '@/components/invoice/InvoiceEditor';

export default async function NewInvoicePage() {
  await requireManagerAccess();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Create New Pay Statement</h1>
        <p className="text-muted-foreground mt-2">Create and manage pay statement data including sales, overrides, and expenses.</p>
      </div>
      
      <InvoiceEditor mode="create" />
    </div>
  );
}
