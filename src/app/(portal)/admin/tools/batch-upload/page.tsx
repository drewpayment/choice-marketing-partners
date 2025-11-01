import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import BatchSalesUpload from '@/components/excel-import/BatchSalesUpload';

export const metadata = {
  title: 'Batch Sales Upload | Admin Tools',
  description: 'Upload multiple sales records from Excel files'
};

export default async function BatchUploadPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    redirect('/forbidden');
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Batch Sales Upload</h1>
        <p className="text-muted-foreground">
          Upload multiple sales records across different vendors and employees from Excel or CSV files.
        </p>
      </div>

      <BatchSalesUpload />
    </div>
  );
}
