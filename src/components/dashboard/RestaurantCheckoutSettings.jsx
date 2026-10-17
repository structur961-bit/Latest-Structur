import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function RestaurantCheckoutSettings({ businessId }) {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ tax_rate_percent: 0, service_charge_percent: 0, receipt_footer_text: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    base44.entities.BusinessSettings.filter({ business_id: businessId }).then(rows => {
      if (!active) return;
      if (rows[0]) {
        setSettings(rows[0]);
        setForm({ tax_rate_percent: Number(rows[0].tax_rate_percent || 0), service_charge_percent: Number(rows[0].service_charge_percent || 0), receipt_footer_text: rows[0].receipt_footer_text || '' });
      }
    }).catch(error => { if (active) setMessage(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId]);
  async function save(event) {
    event.preventDefault(); setSaving(true); setMessage('');
    const data = { ...form, business_id: businessId, tax_rate_percent: Number(form.tax_rate_percent), service_charge_percent: Number(form.service_charge_percent) };
    try {
      const row = settings ? await base44.entities.BusinessSettings.update(settings.id, data) : await base44.entities.BusinessSettings.create(data);
      setSettings(row); setMessage('Checkout settings saved.');
    } catch (error) { setMessage(error.message || 'Could not save checkout settings.'); }
    finally { setSaving(false); }
  }
  return <Card>
    <CardHeader><CardTitle className="text-base">Restaurant checkout</CardTitle></CardHeader>
    <CardContent>
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-muted-foreground">Service charge applies to the subtotal. Tax applies to the subtotal plus service charge. The server calculates the final total.</p>
        {message && <p role="status" className="text-sm">{message}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="tax-rate">Tax (%)</Label><Input id="tax-rate" type="number" min="0" max="100" step="0.01" required value={form.tax_rate_percent} onChange={event => setForm({ ...form, tax_rate_percent: Number(event.target.value) })} /></div>
          <div><Label htmlFor="service-rate">Service charge (%)</Label><Input id="service-rate" type="number" min="0" max="100" step="0.01" required value={form.service_charge_percent} onChange={event => setForm({ ...form, service_charge_percent: Number(event.target.value) })} /></div>
        </div>
        <div><Label htmlFor="receipt-footer">Receipt footer</Label><Input id="receipt-footer" value={form.receipt_footer_text} onChange={event => setForm({ ...form, receipt_footer_text: event.target.value })} /></div>
        <Button disabled={loading || saving} type="submit">{saving ? 'Saving…' : 'Save checkout settings'}</Button>
      </form>
    </CardContent>
  </Card>;
}
