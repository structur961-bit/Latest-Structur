import { useDashboardData } from '@/lib/useDashboardData';
import DashboardDataStatus from '@/components/dashboard/DashboardDataStatus';
import { toast } from 'sonner';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/businessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import StatusBadge from '@/components/common/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Megaphone } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/lib/i18n';

function CampaignForm({ campaign, onSave, onClose }) {
  const { currentBusiness } = useBusiness();
  const { t } = useLanguage();
  const [form, setForm] = useState(campaign || { name: '', channel: 'email', campaign_type: '', status: 'draft' });

  const handleSubmit = async (e) => {
    try {
    e.preventDefault();
    const data = { ...form, business_id: currentBusiness.id };
    if (campaign?.id) await base44.entities.Campaign.update(campaign.id, data);
    else await base44.entities.Campaign.create(data);
    onSave();
  
    } catch(error) { toast.error(error.message || 'Could not save this record.'); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><Label>{t('campaigns.campaignName')}</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="mt-1" /></div>
      <div>
        <Label>{t('campaigns.channel')}</Label>
        <Select value={form.channel} onValueChange={v => setForm({...form, channel: v})}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="email">{t('campaigns.channels.email')}</SelectItem>
            <SelectItem value="whatsapp">{t('campaigns.channels.whatsapp')}</SelectItem>
            <SelectItem value="in_app">{t('campaigns.channels.in_app')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>{t('campaigns.campaignType')}</Label><Input value={form.campaign_type} onChange={e => setForm({...form, campaign_type: e.target.value})} placeholder={t('campaigns.campaignTypePlaceholder')} className="mt-1" /></div>
      <div>
        <Label>{t('common.status')}</Label>
        <Select value={form.status || 'draft'} onValueChange={v => setForm({...form, status: v})}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">{t('common.save')}</Button>
        <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
      </div>
    </form>
  );
}

export default function Campaigns() {
  const { currentBusiness } = useBusiness();
  const { t } = useLanguage();
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: campaigns, loading, error, refresh: load } = useDashboardData(currentBusiness?.id, [], async () => {
    return base44.entities.Campaign.filter({ business_id: currentBusiness.id }, '-created_date');
  });

  return (
    <div className="space-y-5">
      <DashboardDataStatus loading={loading} error={error} onRetry={load} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('campaigns.title')}</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> {t('campaigns.newCampaign')}
        </Button>
      </div>
      <div className="space-y-3">
        {campaigns.map(c => (
          <Card key={c.id} className="p-4 flex items-center justify-between cursor-pointer hover:shadow-sm" onClick={() => { setEditing(c); setShowForm(true); }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary"><Megaphone className="h-4 w-4 text-accent" /></div>
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{t(`campaigns.channels.${c.channel}`, c.channel)} · {c.campaign_type || t('common.all')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-xs text-muted-foreground">
                <p>{c.sent_count || 0} {t('campaigns.sent')}</p>
                <p>{format(new Date(c.created_date), 'MMM d')}</p>
              </div>
              <StatusBadge status={c.status} />
            </div>
          </Card>
        ))}
        {campaigns.length === 0 && <p className="text-center text-muted-foreground py-12">{t('campaigns.noCampaignsYet')}</p>}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('campaigns.editCampaign') : t('campaigns.newCampaign')}</DialogTitle></DialogHeader>
          <CampaignForm campaign={editing} onSave={() => { setShowForm(false); load(); }} onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
