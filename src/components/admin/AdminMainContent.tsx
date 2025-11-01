'use client';

import { useAdminLayout } from '@/contexts/AdminLayoutContext';
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb';
import { cn } from '@/lib/utils';

interface AdminMainContentProps {
  children: React.ReactNode;
}

export default function AdminMainContent({ children }: AdminMainContentProps) {
  const { isCollapsed } = useAdminLayout();

  return (
    <main className={cn(
      'transition-all duration-300',
      // On desktop, adjust margin based on sidebar state
      'lg:ml-72', // Default expanded width (18rem = 288px)
      isCollapsed && 'lg:ml-16' // Collapsed width (4rem = 64px)
    )}>
      <div className="border-b bg-white px-6 py-4">
        <AdminBreadcrumb />
      </div>
      <div className="p-6">
        {children}
      </div>
    </main>
  );
}
