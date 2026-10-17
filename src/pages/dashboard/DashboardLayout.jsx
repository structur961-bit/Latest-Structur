import React, { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';
import { useBusiness } from '@/lib/businessContext';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, Users, ShoppingBag, CalendarCheck, Package,
  Heart, CreditCard, Megaphone, BarChart3, Settings, Menu,
  LogOut, Building2, Sparkles, ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getModulesForVertical } from '@/lib/verticalModules';

const ALL_NAV_ITEMS = [
  { key: 'overview',   icon: LayoutDashboard, path: '/dashboard' },
  { key: 'customers',  icon: Users,            path: '/dashboard/customers' },
  { key: 'products',   icon: ClipboardList,    path: '/dashboard/products' },
  { key: 'orders',     icon: ShoppingBag,      path: '/dashboard/orders' },
  { key: 'bookings',   icon: CalendarCheck,    path: '/dashboard/bookings' },
  { key: 'inventory',  icon: Package,          path: '/dashboard/inventory' },
  { key: 'loyalty',    icon: Heart,            path: '/dashboard/loyalty' },
  { key: 'payments',   icon: CreditCard,       path: '/dashboard/payments' },
  { key: 'campaigns',  icon: Megaphone,        path: '/dashboard/campaigns' },
  { key: 'reports',    icon: BarChart3,        path: '/dashboard/reports' },
  { key: 'settings',   icon: Settings,         path: '/dashboard/settings' },
];

export default function DashboardLayout() {
  const { currentBusiness, loading, error, loadBusiness } = useBusiness();
  const { lang, t } = useLanguage();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const allowedModules = currentBusiness
    ? getModulesForVertical(currentBusiness.vertical, currentBusiness.active_modules_json)
    : [];
  const navItems = ALL_NAV_ITEMS.filter(item => allowedModules.includes(item.key));

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) return <div role="alert" className="p-8 space-y-4"><p>{error}</p><Button onClick={loadBusiness}>Retry</Button></div>;

  if (!currentBusiness) {
    return <Navigate to="/onboarding" replace />;
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Building2 className="h-4 w-4 text-accent-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sidebar-foreground text-sm truncate">{currentBusiness.name}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{currentBusiness.vertical}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ key, icon: Icon, path }) => {
          const active = path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(path);
          return (
            <Link
              key={key}
              to={path}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(`dashboard.${key}`)}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        <Link
          to="/dashboard/ai"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-accent" />
          {t('dashboard.aiAssistants')}
        </Link>
        <button
          onClick={() => base44.auth.logout('/')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {t('dashboard.signOut')}
        </button>
      </div>
    </div>
  );

  return (
    <div className={cn('flex h-screen bg-background', lang === 'ar' ? 'flex-row-reverse' : '')} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-sidebar shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className={`absolute ${lang === 'ar' ? 'right-0' : 'left-0'} top-0 bottom-0 w-64 bg-sidebar`}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-secondary"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 ms-auto">
            <LanguageSwitcher />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
