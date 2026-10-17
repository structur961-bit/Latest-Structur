import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const verticalOptions = [
  'restaurant','clothing','retail','salon','camp','clinic','gym','education','homeServices','events','carServices','distributor'
];

export default function Demo() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', email: '', businessName: '', businessType: '', date: '', time: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    toast.success(t('demo.submitted'));
    setForm({ name: '', email: '', businessName: '', businessType: '', date: '', time: '' });
    setLoading(false);
  };

  return (
    <div className="py-20">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4">{t('demo.title')}</h1>
          <p className="text-lg text-muted-foreground">{t('demo.subtitle')}</p>
        </div>
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('demo.yourName')}</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="mt-1" />
              </div>
              <div>
                <Label>{t('demo.email')}</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="mt-1" />
              </div>
            </div>
            <div>
              <Label>{t('demo.businessName')}</Label>
              <Input value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label>{t('demo.businessType')}</Label>
              <Select value={form.businessType} onValueChange={v => setForm({ ...form, businessType: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={t('demo.businessTypePlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {verticalOptions.map(v => (
                    <SelectItem key={v} value={v}>{t(`onboarding.verticals.${v}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('demo.preferredDate')}</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>{t('demo.preferredTime')}</Label>
                <Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="mt-1" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-full">
              {loading ? t('demo.submitting') : t('demo.bookDemo')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}