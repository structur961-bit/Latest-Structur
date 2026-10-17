import { useDashboardData } from '@/lib/useDashboardData';
import DashboardDataStatus from '@/components/dashboard/DashboardDataStatus';
import { toast } from 'sonner';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/businessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/lib/i18n';

function AdjustPointsForm({ customers, onSave, onClose }) {
  const { currentBusiness } = useBusiness();
  const { t } = useLanguage();
  const [form, setForm] = useState({ customer_id: '', points_delta: '', reason: '' });

  const handleSubmit = async (e) => {
    try {
    e.preventDefault();
    if (!form.customer_id || !Number.isInteger(Number(form.points_delta)) || !Number(form.points_delta)) return;
    await base44.entities.LoyaltyLedger.create({
      business_id: currentBusiness.id,
      customer_id: form.customer_id,
      points_delta: Number(form.points_delta),
      reason: form.reason,
      source_type: 'manual',
    });
    onSave();
  
    } catch(error) { toast.error(error.message || 'Could not save this record.'); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>{t('loyalty.customer')}</Label>
        <Select value={form.customer_id} onValueChange={v => setForm({...form, customer_id: v})}>
          <SelectTrigger className="mt-1"><SelectValue placeholder={t('loyalty.selectCustomer')} /></SelectTrigger>
          <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>{t('loyalty.pointsHint')}</Label><Input type="number" value={form.points_delta} onChange={e => setForm({...form, points_delta: e.target.value})} required className="mt-1" /></div>
      <div><Label>{t('loyalty.reason')}</Label><Input value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="mt-1" /></div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">{t('common.apply')}</Button>
        <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
      </div>
    </form>
  );
}

export default function Loyalty() {
  const { currentBusiness } = useBusiness();
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);

  const { data: { customers, ledger }, loading, error, refresh: load } = useDashboardData(currentBusiness?.id, { customers: [], ledger: [] }, async () => {
    const [customers,ledger] = await Promise.all([base44.entities.Customer.filter({ business_id: currentBusiness.id }, '-loyalty_points'),base44.entities.LoyaltyLedger.filter({ business_id: currentBusiness.id }, '-created_date')]); return { customers, ledger };
  });

  return (
    <div className="space-y-6">
      <DashboardDataStatus loading={loading} error={error} onRetry={load} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('loyalty.title')}</h1>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" /> {t('loyalty.adjustPoints')}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">{t('loyalty.topCustomers')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {customers.slice(0, 10).map((c, i) => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                    {c.full_name?.charAt(0)}
                  </div>
                  <span className="text-sm font-medium">{c.full_name}</span>
                </div>
                <div className="flex items-center gap-1 text-accent font-semibold text-sm">
                  <Star className="h-3.5 w-3.5" />
                  {c.loyalty_points || 0}
                </div>
              </div>
            ))}
            {customers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t('loyalty.noData')}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t('loyalty.recentTransactions')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ledger.map(entry => (
              <div key={entry.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{entry.reason || t('loyalty.adjustment')}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(entry.created_date), 'MMM d, h:mm a')}</p>
                </div>
                <span className={`font-bold ${entry.points_delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {entry.points_delta >= 0 ? '+' : ''}{entry.points_delta}
                </span>
              </div>
            ))}
            {ledger.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t('loyalty.noTransactions')}</p>}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('loyalty.adjustLoyaltyPoints')}</DialogTitle></DialogHeader>
          <AdjustPointsForm customers={customers} onSave={() => { setShowForm(false); load(); }} onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}