import { useDashboardData } from '@/lib/useDashboardData';
import DashboardDataStatus from '@/components/dashboard/DashboardDataStatus';
import { toast } from 'sonner';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/businessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Phone, Mail, Star } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

function CustomerForm({ customer, onSave, onClose }) {
  const [form, setForm] = useState(customer || { full_name: '', phone: '', email: '', notes: '' });
  const { currentBusiness } = useBusiness();
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    try {
    e.preventDefault();
    const data = { ...form, business_id: currentBusiness.id };
    if (customer?.id) await base44.entities.Customer.update(customer.id, data);
    else await base44.entities.Customer.create(data);
    onSave();
  
    } catch(error) { toast.error(error.message || 'Could not save this record.'); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><Label>{t('customers.fullName')}</Label><Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required className="mt-1" /></div>
      <div><Label>{t('common.phone')}</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="mt-1" /></div>
      <div><Label>{t('common.email')}</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="mt-1" /></div>
      <div><Label>{t('common.notes')}</Label><Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1" /></div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">{t('common.save')}</Button>
        <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
      </div>
    </form>
  );
}

export default function Customers() {
  const { currentBusiness } = useBusiness();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: customers, loading, error, refresh: load } = useDashboardData(currentBusiness?.id, [], async () => {
    return base44.entities.Customer.filter({ business_id: currentBusiness.id }, '-created_date');
  });

  const filtered = customers.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <DashboardDataStatus loading={loading} error={error} onRetry={load} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('customers.title')}</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> {t('customers.addCustomer')}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t('customers.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="ps-9" />
      </div>

      <div className="grid gap-3">
        {filtered.map(c => (
          <Card key={c.id} className="p-4 flex items-center justify-between hover:shadow-sm transition-shadow cursor-pointer" onClick={() => { setEditing(c); setShowForm(true); }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-semibold text-sm">
                {c.full_name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{c.full_name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                  {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                </div>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium text-accent flex items-center gap-1"><Star className="h-3 w-3" />{c.loyalty_points || 0} {t('customers.pts')}</p>
              <p className="text-xs text-muted-foreground">{(c.total_spent || 0).toFixed(2)} {currentBusiness.currency} {t('customers.spent')}</p>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">{t('customers.noCustomersFound')}</p>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('customers.editCustomer') : t('customers.addCustomer')}</DialogTitle></DialogHeader>
          <CustomerForm customer={editing} onSave={() => { setShowForm(false); load(); }} onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}