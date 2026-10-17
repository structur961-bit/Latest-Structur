import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/businessContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import StatCard from '@/components/common/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ShoppingBag, Users, CreditCard, CalendarCheck } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { useLanguage } from '@/lib/i18n';

export default function Reports() {
  const { currentBusiness } = useBusiness();
  const { t } = useLanguage();
  const [data, setData] = useState({ orders: [], customers: [], payments: [], bookings: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBusiness) return;
    const id = currentBusiness.id;
    Promise.all([
      base44.entities.Order.filter({ business_id: id }, '-created_date'),
      base44.entities.Customer.filter({ business_id: id }),
      base44.entities.Payment.filter({ business_id: id, status: 'paid' }),
      base44.entities.Booking.filter({ business_id: id }, '-created_date'),
    ]).then(([orders, customers, payments, bookings]) => {
      setData({ orders, customers, payments, bookings });
      setLoading(false);
    });
  }, [currentBusiness]);

  const totalRevenue = data.payments.reduce((s, p) => s + (p.amount || 0), 0);

  // Build last 7 days chart data
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const label = format(day, 'MMM d');
    const dayStart = startOfDay(day).getTime();
    const dayEnd = dayStart + 86400000;
    const orders = data.orders.filter(o => {
      const t = new Date(o.created_date).getTime();
      return t >= dayStart && t < dayEnd;
    }).length;
    const revenue = data.payments.filter(p => {
      const t = new Date(p.created_date).getTime();
      return t >= dayStart && t < dayEnd;
    }).reduce((s, p) => s + (p.amount || 0), 0);
    return { label, orders, revenue };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('reports.title')}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('reports.totalOrders')} value={loading ? '—' : data.orders.length} icon={ShoppingBag} />
        <StatCard title={t('reports.customers')} value={loading ? '—' : data.customers.length} icon={Users} />
        <StatCard title={t('reports.revenue')} value={loading ? '—' : `${totalRevenue.toFixed(0)} ${currentBusiness?.currency || 'USD'}`} icon={CreditCard} />
        <StatCard title={t('reports.bookings')} value={loading ? '—' : data.bookings.length} icon={CalendarCheck} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">{t('reports.ordersLast7')}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={last7}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t('reports.revenueLast7')}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={last7}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={v => `${Number(v).toFixed(2)} ${currentBusiness?.currency || 'USD'}`} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
