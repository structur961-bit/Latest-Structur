import { useDashboardData } from '@/lib/useDashboardData';
import DashboardDataStatus from '@/components/dashboard/DashboardDataStatus';
import { toast } from 'sonner';
import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/businessContext';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import StatusBadge from '@/components/common/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/lib/i18n';

const STATUSES = ['open','pending','confirmed','preparing','ready','completed','cancelled','refunded'];

export default function Orders() {
  const { currentBusiness } = useBusiness();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState({ loading: false, items: [], customer: null });
  const detailRequest = useRef(0);

  const { data: orders, loading, error, refresh: load } = useDashboardData(currentBusiness?.id, [], async () => {
    return base44.entities.Order.filter({ business_id: currentBusiness.id }, '-created_date');
  });

  const updateStatus = async (orderId, status) => {
    try {
      const updated = await base44.entities.Order.update(orderId, { status });
      await load();
      setSelected(prev => prev?.id === orderId ? updated : prev);
    } catch (error) { toast.error(error.message || 'Could not update this order.'); }
  };

  const openOrder = async order => {
    const request = ++detailRequest.current;
    setSelected(order);
    setDetails({ loading: true, items: [], customer: null });
    try {
      const [items, customers] = await Promise.all([
        base44.entities.OrderItem.filter({ order_id: order.id }, 'created_date'),
        order.customer_id ? base44.entities.Customer.filter({ id: order.customer_id }, 'created_date', 1) : Promise.resolve([]),
      ]);
      if (detailRequest.current === request) setDetails({ loading: false, items, customer: customers[0] || null });
    } catch (error) {
      if (detailRequest.current === request) {
        toast.error(error.message || 'Could not load order details.');
        setDetails({ loading: false, items: [], customer: null });
      }
    }
  };

  const updatePayment = async (order, paymentStatus) => {
    try {
      await base44.restaurant.setOrderPaymentStatus(order.id, paymentStatus);
      await load();
      setSelected(previous => previous?.id === order.id ? { ...previous, payment_status: paymentStatus } : previous);
    } catch (error) { toast.error(error.message || 'Could not update the payment.'); }
  };

  const filtered = orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.status?.includes(search)
  );

  return (
    <div className="space-y-5">
      <DashboardDataStatus loading={loading} error={error} onRetry={load} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('orders.title')}</h1>
      </div>
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t('orders.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="ps-9" />
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-start p-3 font-medium">{t('orders.orderNumber')}</th>
              <th className="text-start p-3 font-medium">{'Order type'}</th>
              <th className="text-start p-3 font-medium">{t('common.date')}</th>
              <th className="text-start p-3 font-medium">{t('orders.total')}</th>
              <th className="text-start p-3 font-medium">{t('common.status')}</th>
              <th className="text-start p-3 font-medium">{t('orders.payment')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-b border-border hover:bg-muted/30 cursor-pointer" onClick={() => openOrder(o)}>
                <td className="p-3 font-medium">#{o.order_number}</td>
                <td className="p-3 capitalize text-muted-foreground">{o.order_type}</td>
                <td className="p-3 text-muted-foreground">{format(new Date(o.created_date), 'MMM d, h:mm a')}</td>
                <td className="p-3 font-medium">{o.total?.toFixed(2) || '0.00'} {o.currency || currentBusiness?.currency || 'USD'}</td>
                <td className="p-3"><StatusBadge status={o.status} /></td>
                <td className="p-3"><StatusBadge status={o.payment_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">{t('orders.noOrdersFound')}</p>}
      </Card>

      <Dialog open={!!selected} onOpenChange={() => { detailRequest.current++; setSelected(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('orders.orderNumber')} #{selected?.order_number}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-4 text-sm">
                <div><span className="text-muted-foreground">{'Order type'}:</span> <span className="font-medium capitalize">{selected.order_type}</span></div>
                <div><span className="text-muted-foreground">{t('orders.total')}:</span> <span className="font-medium">{selected.total?.toFixed(2)} {selected.currency || currentBusiness?.currency || 'USD'}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{selected.order_type || 'pickup'}</span></div>
                <div><span className="text-muted-foreground">Created:</span> <span className="font-medium">{format(new Date(selected.created_date), 'MMM d, yyyy h:mm a')}</span></div>
              </div>
              {details.loading ? <div className="flex justify-center py-5"><Loader2 className="h-5 w-5 animate-spin" /></div> : <>
                {details.customer && <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</p><p className="mt-1 font-medium">{details.customer.full_name}</p><p className="text-sm text-muted-foreground">{[details.customer.phone, details.customer.email].filter(Boolean).join(' · ')}</p></div>}
                <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items</p><div className="mt-2 divide-y rounded-xl border">{details.items.map(item => <div key={item.id} className="flex justify-between gap-4 p-3 text-sm"><span><strong>{item.quantity}×</strong> {item.name_snapshot}</span><span>{item.line_total?.toFixed(2)} {currentBusiness.currency}</span></div>)}{!details.items.length && <p className="p-3 text-sm text-muted-foreground">No item lines were found.</p>}</div></div>
              </>}
              <div>
                <Label>{t('orders.updateStatus')}</Label>
                <Select value={selected.status} onValueChange={v => updateStatus(selected.id, v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{t(`orders.statuses.${s}`, s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Payment status</Label><Select value={selected.payment_status || 'unpaid'} onValueChange={value => updatePayment(selected, value)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unpaid">Unpaid</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="refunded">Refunded</SelectItem>{selected.payment_status === 'partial' && <SelectItem value="partial" disabled>Partially paid</SelectItem>}</SelectContent></Select></div>
              <div className="text-sm space-y-1"><p>Subtotal: {selected.subtotal?.toFixed(2)}</p><p>Service charge: {selected.service_charge?.toFixed(2) || '0.00'}</p><p>Tax: {selected.tax?.toFixed(2) || '0.00'}</p><p>Inventory: {selected.inventory_deducted ? 'Deducted' : 'Not deducted'}</p>{selected.table_label && <p>Table: {selected.table_label}</p>}</div>
              {selected.delivery_address && <div className="text-sm"><span className="text-muted-foreground">Delivery address: </span>{selected.delivery_address}</div>}
              {selected.customer_notes && <div className="text-sm"><span className="text-muted-foreground">{t('orders.notes')}: </span>{selected.customer_notes}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
