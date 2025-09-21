'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  BarChart3, 
  Wrench, 
  Home,
  ChevronLeft,
  Menu,
  Users,
  UserCheck
} from 'lucide-react';
import { useState } from 'react';
import { useAdminLayout } from '@/contexts/AdminLayoutContext';

const adminNavItems = [
  {
    href: '/admin',
    icon: Home,
    label: 'Overview',
    description: 'Admin dashboard overview'
  },
  {
    href: '/admin/employees',
    icon: UserCheck,
    label: 'Employee Management',
    description: 'Manage employees and user accounts'
  },
  {
    href: '/admin/settings',
    icon: Settings,
    label: 'Company Settings',
    description: 'Email notifications, payroll restrictions'
  },
  {
    href: '/admin/payroll-monitoring',
    icon: BarChart3,
    label: 'Payroll Monitor',
    description: 'Track paid/unpaid status'
  },
  {
    href: '/admin/overrides',
    icon: Users,
    label: 'Agents & Overrides',
    description: 'Manage manager assignments'
  },
  {
    href: '/admin/tools',
    icon: Wrench,
    label: 'Admin Tools',
    description: 'Reprocess payroll, system tools'
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed } = useAdminLayout();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <button 
          type="button" 
          className="-m-2.5 p-2.5 text-gray-700"
          onClick={() => setIsMobileOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">Admin Panel</div>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div className="relative z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-900/80" onClick={() => setIsMobileOpen(false)} />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button 
                  type="button" 
                  className="-m-2.5 p-2.5"
                  onClick={() => setIsMobileOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <ChevronLeft className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2">
                <div className="flex h-16 shrink-0 items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
                </div>
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {adminNavItems.map((item) => {
                          const isActive = pathname === item.href;
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                className={cn(
                                  'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold',
                                  isActive
                                    ? 'bg-gray-50 text-blue-600'
                                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                                )}
                                onClick={() => setIsMobileOpen(false)}
                              >
                                <item.icon className="h-6 w-6 shrink-0" />
                                {item.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className={cn(
        'hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col border-r border-gray-200 bg-white transition-all duration-300',
        isCollapsed ? 'lg:w-16' : 'lg:w-72'
      )}>
        <div className="flex grow flex-col gap-y-5 overflow-y-auto px-6">
          <div className="flex h-16 shrink-0 items-center justify-between">
            {!isCollapsed && (
              <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className={cn(
                'h-4 w-4 transition-transform',
                isCollapsed && 'rotate-180'
              )} />
            </Button>
          </div>
          
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {adminNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors',
                            isActive
                              ? 'bg-gray-50 text-blue-600'
                              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                          )}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <item.icon className="h-6 w-6 shrink-0" />
                          {!isCollapsed && (
                            <div className="flex flex-col min-w-0">
                              <span className="truncate">{item.label}</span>
                              <span className="text-xs text-gray-500 font-normal truncate">
                                {item.description}
                              </span>
                            </div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
