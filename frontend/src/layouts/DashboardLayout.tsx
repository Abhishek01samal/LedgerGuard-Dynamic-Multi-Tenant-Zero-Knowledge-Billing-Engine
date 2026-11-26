import React, { useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { Breadcrumbs, type BreadcrumbItem } from '../components/layout/Breadcrumbs';
import type { Tenant } from '../types';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  tenants: Tenant[];
  currentTenant?: Tenant;
  onTenantChange: (tenant: Tenant) => void;
  breadcrumbs?: BreadcrumbItem[];
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onViewLandingPage?: () => void;
  onLogout?: () => void;
  onOpenGlobalSearch?: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  tenants,
  currentTenant,
  onTenantChange,
  breadcrumbs,
  title,
  subtitle,
  actions,
  onViewLandingPage,
  onLogout,
  onOpenGlobalSearch,
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        tenants={tenants}
        currentTenant={currentTenant}
        onTenantChange={onTenantChange}
        onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onViewLandingPage={onViewLandingPage}
        onLogout={onLogout}
        onOpenGlobalSearch={onOpenGlobalSearch}
      />

      <div className="flex flex-1">
        {/* Responsive Sidebar (Desktop persistent + Mobile slide-over drawer) */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isDesktopCollapsed}
          onToggleCollapse={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
          {/* Breadcrumb Path & Page Header */}
          {(breadcrumbs || title || actions) && (
            <div className="space-y-3 pb-2 border-b border-slate-200">
              {breadcrumbs && (
                <Breadcrumbs
                  items={breadcrumbs}
                  onHomeClick={() => onTabChange('dashboard')}
                />
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  {title && (
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
                  )}
                </div>

                {actions && <div className="flex items-center gap-2">{actions}</div>}
              </div>
            </div>
          )}

          {/* Child Page Views */}
          {children}
        </main>
      </div>
    </div>
  );
};
