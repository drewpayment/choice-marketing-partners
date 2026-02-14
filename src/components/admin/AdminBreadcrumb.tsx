'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const getBreadcrumbItems = (pathname: string): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];

  // Always start with Dashboard
  items.push({ label: 'Dashboard', href: '/dashboard' });

  if (segments.includes('admin')) {
    items.push({ label: 'Admin', href: '/admin' });

    // Handle specific admin pages
    if (segments.includes('settings')) {
      items.push({ label: 'Company Settings' });
    } else if (segments.includes('payroll-monitoring')) {
      items.push({ label: 'Payroll Monitoring' });
    } else if (segments.includes('tools')) {
      items.push({ label: 'Admin Tools' });
    }
  }

  return items;
};

export default function AdminBreadcrumb() {
  const pathname = usePathname();
  const breadcrumbItems = getBreadcrumbItems(pathname);

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground mx-2" />
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-sm font-medium text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
