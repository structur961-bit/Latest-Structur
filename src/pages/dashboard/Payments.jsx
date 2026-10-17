import { useDashboardData } from '@/lib/useDashboardData';
import DashboardDataStatus from '@/components/dashboard/DashboardDataStatus';
import { toast } from 'sonner';
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/businessContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import { CreditCard, TrendingUp, AlertCircle, ReceiptText, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/lib/i18n';
import PaymentMethodsSettings from '@/components/payments/PaymentMethodsSettings';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'transactions', label: 'Transactions', icon: ReceiptText },
  { id: 'methods', label: 'Payment Methods', icon: CreditCard },
];

function ManualPaymentForm({ business, onSave, onClose }) {
  const [form, setForm] = useState({ order_id: 'none', amount: '', status: 'paid', payment_method: 'cash', notes: '' });
  const [orders, setOrders] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Order.filter({ business_id: business.id }, '-created_date').then(setOrders).catch(error => toast.error(error.message || 'Could not load orders.'));
  }, [business.id]);

  const chooseOrder = (orderId) => {
    const order = orders.find(item => item.id === orderId);
    setForm({ ...form, order_id: orderId, amount: order ? String(order.total || '') : form.amount });
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const order = orders.find(item => item.id === form.order_id);
      await base44.entities.Payment.create({
        business_id: business.id,
        order_id: order?.id || null,
        customer_id: order?.customer_id || null,
        amount: Number(form.amount),
        currency: business.currency || 'USD',
        status: form.status,
        payment_method: form.payment_method,
        notes: form.notes,
        paid_at: form.status === 'paid' ? new Date().toISOString() : null,
      });
      onSave();
    } catch(error) { toast.error(error.message || 'Could not record the payment.'); } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><Label>Order (optional)</Label><Select value={form.order_id} onValueChange={chooseOrder}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No linked order</SelectItem>{orders.map(order => <SelectItem key={order.id} value={order.id}>#{order.order_number} · {(order.total || 0).toFixed(2)} {order.currency}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Amount *</Label><Input type="number" min="0.01" step="0.01" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="mt-1" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Method</Label><Select value={form.payment_method} onValueChange={value => setForm({...form, payment_method: value})}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank transfer</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
        <div><Label>Status</Label><Select value={form.status} onValueChange={value => setForm({...form, status: value})}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="refunded">Refunded</SelectItem></SelectContent></Select></div>
      </div>
      <div><Label>Reference / notes</Label><Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1" /></div>
      <p className="text-xs text-muted-foreground">This records an offline transaction only. It does not charge a card.</p>
      <div className="flex gap-2"><Button className="flex-1" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Record payment'}</Button><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></div>
    </form>
  );
}

export default function Payments() {
  const { currentBusiness } = useBusiness();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('transactions');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const { data: payments, loading, error, refresh: load } = useDashboardData(currentBusiness?.id, [], () => base44.entities.Payment.filter({ business_id: currentBusiness.id }, '-created_date'));

  const paid = payments.filter(p => p.status === 'paid');
  const totalRevenue = paid.reduce((s, p) => s + (p.amount || 0), 0);
  const pending = payments.filter(p => p.status === 'pending');
  const failed = payments.filter(p => p.status === 'failed');

  return (
    <div className="space-y-6">
      <DashboardDataStatus loading={loading} error={error} onRetry={load} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('payments.title')}</h1>
        <Button onClick={() => setShowPaymentForm(true)} className="gap-2"><Plus className="h-4 w-4" /> Record payment</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title={t('payments.totalRevenue')} value={`${totalRevenue.toFixed(2)} ${currentBusiness?.currency || 'USD'}`} icon={TrendingUp} />
        <StatCard title={t('payments.pending')} value={pending.length} icon={CreditCard} />
        <StatCard title={t('payments.failed')} value={failed.length} icon={AlertCircle} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit border border-border/50">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-background shadow-sm text-foreground border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'transactions' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-start p-3 font-medium">{t('payments.date')}</th>
                  <th className="text-start p-3 font-medium">{t('payments.amount')}</th>
                  <th className="text-start p-3 font-medium">{t('payments.currency')}</th>
                  <th className="text-start p-3 font-medium">{t('payments.method')}</th>
                  <th className="text-start p-3 font-medium">{t('payments.gateway')}</th>
                  <th className="text-start p-3 font-medium">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground">{format(new Date(p.created_date), 'MMM d, yyyy')}</td>
                    <td className="p-3 font-medium">{p.amount?.toFixed(2)}</td>
                    <td className="p-3 text-muted-foreground">{p.currency || 'USD'}</td>
                    <td className="p-3 text-muted-foreground capitalize">{p.payment_method || '—'}</td>
                    <td className="p-3 text-muted-foreground">{p.gateway || '—'}</td>
                    <td className="p-3"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-12">{t('payments.noPaymentsYet')}</p>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'methods' && <PaymentMethodsSettings />}

      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record manual payment</DialogTitle></DialogHeader>
          <ManualPaymentForm business={currentBusiness} onSave={() => { setShowPaymentForm(false); load(); }} onClose={() => setShowPaymentForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
