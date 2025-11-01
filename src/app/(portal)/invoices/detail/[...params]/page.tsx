import { requireManagerAccess } from '@/lib/auth/server-auth';
import InvoiceEditor from '@/components/invoice/InvoiceEditor';
import { notFound } from 'next/navigation';
import { invoiceRepository } from '@/lib/repositories/InvoiceRepository';

interface EditInvoicePageProps {
  params: Promise<{
    params: string[];
  }>;
}

export default async function EditInvoicePage({ params: paramsPromise }: EditInvoicePageProps) {
  const params = await paramsPromise;
  console.log('🚀 EditInvoicePage reached with params:', params);

  await requireManagerAccess();
  
  // Extract parameters from the catch-all route
  const vals = params;
  console.log(vals);
  
  const routeParams = vals.params;
  console.log(routeParams)
  
  // Expect exactly 3 parameters: employeeId, vendorId, issueDate
  if (!routeParams || routeParams.length !== 3) {
    console.error('❌ Invalid route parameters. Expected 3 params, got:', routeParams?.length);
    notFound();
  }
  
  const [employeeId, vendorId, issueDate] = routeParams;
  
  // Validate that employeeId and vendorId are numbers
  if (isNaN(Number(employeeId)) || isNaN(Number(vendorId))) {
    console.error('❌ Invalid parameters. employeeId and vendorId must be numbers:', { employeeId, vendorId });
    notFound();
  }
  
  // Validate date format (MM-DD-YYYY)
  const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
  if (!dateRegex.test(issueDate)) {
    console.error('❌ Invalid date format. Expected MM-DD-YYYY, got:', issueDate);
    notFound();
  }

  console.log('✅ EditInvoicePage resolved params:', { employeeId, vendorId, issueDate });

  // Fetch invoice details using SSR
  const agentId = parseInt(employeeId);
  const vendorIdNum = parseInt(vendorId);
  
  try {
    const invoiceDetails = await invoiceRepository.getInvoiceDetail(agentId, vendorIdNum, issueDate);
    
    if (!invoiceDetails) {
      console.error('❌ Invoice not found for:', { agentId, vendorIdNum, issueDate });
      notFound();
    }

    console.log('✅ SSR - Invoice details loaded:', { 
      invoicesCount: invoiceDetails.invoices.length, 
      overridesCount: invoiceDetails.overrides.length, 
      expensesCount: invoiceDetails.expenses.length,
    });

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Pay Statement</h1>
          <p className="text-gray-600 mt-2">
            Employee {employeeId} • Vendor {vendorId} • Issue Date: {issueDate} • Weekending: {invoiceDetails?.weekending || ''}
          </p>
        </div>
        
        <InvoiceEditor 
          mode="edit" 
          agentId={agentId}
          vendorId={vendorIdNum}
          issueDate={issueDate}
          initialData={invoiceDetails}
        />
      </div>
    );
  } catch (error) {
    console.error('❌ Error loading invoice details:', error);
    throw error; // This will trigger Next.js error boundary
  }
}
