import RestaurantCheckoutSettings from '@/components/dashboard/RestaurantCheckoutSettings';
import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/businessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Loader2 } from 'lucide-react';
import OpeningHours from '@/components/dashboard/OpeningHours';
import StorefrontSettings from '@/components/dashboard/StorefrontSettings';
import { useLanguage } from '@/lib/i18n';

const CURRENCIES = ['USD', 'LBP', 'AED', 'SAR', 'EUR', 'GBP'];
const TIMEZONES = ['Asia/Beirut', 'Asia/Dubai', 'Asia/Riyadh', 'Europe/London', 'UTC'];

const COUNTRIES = [
  'Lebanon', 'United Arab Emirates', 'Saudi Arabia', 'Kuwait', 'Qatar', 'Bahrain', 'Oman',
  'Egypt', 'Jordan', 'Iraq', 'United Kingdom', 'United States', 'France', 'Germany',
  'Turkey', 'Australia', 'Canada', 'South Africa', 'India', 'Other',
];

export default function DashboardSettings() {
  const { currentBusiness, setCurrentBusiness } = useBusiness();
  const { t } = useLanguage();
  const [form, setForm] = useState(currentBusiness || {});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, logo_url: file_url }));
    } catch (error) { toast.error(error.message || 'Could not upload the logo.'); }
    finally { setUploading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await base44.entities.Business.update(form.id, form);
      setCurrentBusiness(updated);
      toast.success(t('settings.savedSuccess'));
    } catch (error) { toast.error(error.message || 'Could not save settings.'); }
    finally { setLoading(false); }
  };

  if (!currentBusiness) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Logo */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t('settings.storeLogo')}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted shrink-0">
                {form.logo_url
                  ? <img src={form.logo_url} alt="logo" className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold text-muted-foreground">{form.name?.[0]?.toUpperCase() || 'S'}</span>
                }
              </div>
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />{t('common.uploading')}</> : <><Upload className="w-4 h-4" />{t('settings.uploadLogo')}</>}
                </Button>
                <p className="text-xs text-muted-foreground mt-1.5">{t('settings.logoHint')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* General */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t('settings.general')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>{t('settings.businessName')}</Label><Input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} required className="mt-1" /></div>
            <div>
              <Label>{t('settings.about')}</Label>
              <Textarea
                value={form.about || ''}
                onChange={e => setForm({...form, about: e.target.value})}
                placeholder={t('settings.aboutPlaceholder')}
                className="mt-1 min-h-[90px]"
              />
            </div>
            <div><Label>{t('settings.phone')}</Label><Input value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} className="mt-1" /></div>
            <div><Label>{t('settings.email')}</Label><Input type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('settings.country')}</Label>
                <Select value={form.country || ''} onValueChange={v => setForm({...form, country: v})}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={t('settings.selectCountry')} /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t('settings.city')}</Label><Input value={form.city || ''} onChange={e => setForm({...form, city: e.target.value})} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('settings.currency')}</Label>
                <Select value={form.currency || 'USD'} onValueChange={v => setForm({...form, currency: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('settings.timezone')}</Label>
                <Select value={form.timezone || 'Asia/Beirut'} onValueChange={v => setForm({...form, timezone: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t('settings.defaultLanguage')}</Label>
              <Select value={form.language_default || 'en'} onValueChange={v => setForm({...form, language_default: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('settings.english')}</SelectItem>
                  <SelectItem value="ar">{t('settings.arabic')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Opening Hours */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t('settings.openingHours')}</CardTitle></CardHeader>
          <CardContent>
            <OpeningHours
              value={form.opening_hours_json || ''}
              onChange={v => setForm({...form, opening_hours_json: v})}
            />
          </CardContent>
        </Card>

        {/* Storefront */}
        <StorefrontSettings form={form} setForm={setForm} />

        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t('common.saving')}</> : t('common.saveChanges')}
        </Button>

      </form>
      {currentBusiness.vertical === 'restaurant' && <RestaurantCheckoutSettings businessId={currentBusiness.id} />}
    </div>
  );
}