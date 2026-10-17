import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, MapPin, Phone } from 'lucide-react';

export default function Contact() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Placeholder — in production, send via backend function
    await new Promise(r => setTimeout(r, 1000));
    toast.success(t('contact.sent'));
    setForm({ name: '', email: '', message: '' });
    setLoading(false);
  };

  return (
    <div className="py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('contact.title')}</h1>
          <p className="text-lg text-muted-foreground">{t('contact.subtitle')}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-10">
          <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label>{t('contact.nameLabel')}</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="mt-1" />
              </div>
              <div>
                <Label>{t('contact.emailLabel')}</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="mt-1" />
              </div>
              <div>
                <Label>{t('contact.messageLabel')}</Label>
                <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required rows={5} className="mt-1" />
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-full">
                {loading ? t('common.loading') : t('contact.send')}
              </Button>
            </form>
          </Card>
          <div className="space-y-6 pt-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-secondary"><Mail className="h-5 w-5 text-accent" /></div>
              <div>
                <p className="font-medium">{t('contact.emailLabel2')}</p>
                <p className="text-muted-foreground text-sm">hello@structur.app</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-secondary"><Phone className="h-5 w-5 text-accent" /></div>
              <div>
                <p className="font-medium">{t('contact.phoneLabel')}</p>
                <p className="text-muted-foreground text-sm">+961 XX XXX XXX</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-secondary"><MapPin className="h-5 w-5 text-accent" /></div>
              <div>
                <p className="font-medium">{t('contact.locationLabel')}</p>
                <p className="text-muted-foreground text-sm">Beirut, Lebanon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}