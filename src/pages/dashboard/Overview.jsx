import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/businessContext';
import StatCard from '@/components/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import StatusBadge from '@/components/common/StatusBadge';
import { ShoppingBag, Users, CreditCard, CalendarCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/lib/i18n';

export default function Overview() {
  const { currentBusiness } = useBusiness();
  const { t } = useLanguage();
  const [stats, setStats] = useState({ orders: 0, customers: 0, revenue: 0, bookings: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBusiness) return;
    const biz = currentBusiness.id;
    Promise.all([
      base44.entities.Order.filter({ business_id: biz }, '-created_date'),
      base44.entities.Customer.filter({ business_id: biz }),
      base44.entities.Booking.filter({ business_id: biz }, '-created_date'),
      base44.entities.Payment.filter({ business_id: biz, status: 'paid' }),
    ]).then(([orders, customers, bookings, payments]) => {
      const revenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
      setStats({ orders: orders.length, customers: customers.length, revenue, bookings: bookings.length });
      setRecentOrders(orders.slice(0, 5));
      setRecentBookings(bookings.filter(booking => new Date(booking.start_at).getTime() >= Date.now() && ['pending', 'confirmed'].includes(booking.status)).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()).slice(0, 5));
      setLoading(false);
    });
  }, [currentBusiness]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboard.overview')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('dashboard.whatHappeningToday')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title={t('dashboard.totalOrders')} value={loading ? '—' : stats.orders} icon={ShoppingBag} />
        <StatCard title={t('dashboard.customers')} value={loading ? '—' : stats.customers} icon={Users} />
        <StatCard title={t('dashboard.totalRevenue')} value={loading ? '—' : `${stats.revenue.toFixed(2)} ${currentBusiness?.currency || 'USD'}`} icon={CreditCard} />
        <StatCard title={t('dashboard.totalBookings')} value={loading ? '—' : stats.bookings} icon={CalendarCheck} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">{t('dashboard.recentOrders')}</CardTitle></CardHeader>
          <CardContent>
            {recentOrders.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-6">{t('empty.noOrders')}</p>
            )}
            <div className="space-y-3">
              {recentOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">#{o.order_number}</p>
                    <p className="text-muted-foreground text-xs">{format(new Date(o.created_date), 'MMM d, h:mm a')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{o.total?.toFixed(2) || '0.00'} {o.currency || currentBusiness?.currency || 'USD'}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t('dashboard.upcomingBookings')}</CardTitle></CardHeader>
          <CardContent>
            {recentBookings.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-6">{t('empty.noBookings')}</p>
            )}
            <div className="space-y-3">
              {recentBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium capitalize">{t(`bookings.types.${b.booking_type}`, b.booking_type?.replace('_', ' '))}</p>
                    <p className="text-muted-foreground text-xs">{b.start_at ? format(new Date(b.start_at), 'MMM d, h:mm a') : '—'}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
