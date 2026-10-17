import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  UtensilsCrossed, Shirt, Store, Scissors, TreePine, Stethoscope,
  Dumbbell, GraduationCap, Wrench, PartyPopper, Car, Truck, Check
} from 'lucide-react';

const VERTICALS = [
  { key: 'restaurant', icon: UtensilsCrossed },
  { key: 'clothing', icon: Shirt },
  { key: 'retail', icon: Store },
  { key: 'salon', icon: Scissors },
  { key: 'camp', icon: TreePine },
  { key: 'clinic', icon: Stethoscope },
  { key: 'gym', icon: Dumbbell },
  { key: 'education', icon: GraduationCap },
  { key: 'homeServices', icon: Wrench },
  { key: 'events', icon: PartyPopper },
  { key: 'carServices', icon: Car },
  { key: 'distributor', icon: Truck },
];

const STEPS = ['vertical', 'details', 'done'];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function Onboarding() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [vertical, setVertical] = useState('');
  const [form, setForm] = useState({ name: '', city: '', currency: 'USD', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!form.name.trim() || !vertical || loading) return;
    setLoading(true);
    setError('');
    try {
      const user = await base44.auth.me();
      const existing = await base44.entities.Business.filter({ owner_user_id: user.id }, '-created_date', 1);
      if (existing.length) {
        await base44.auth.updateMe({ current_business_id: existing[0].id });
        window.location.href = '/dashboard';
        return;
      }
      const slug = slugify(form.name) + '-' + Date.now();
      const business = await base44.entities.Business.create({
        ...form,
        name: form.name.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        slug,
        vertical,
        owner_user_id: user.id,
        status: 'trial',
        storefront_published: vertical === 'restaurant',
        onboarding_status: 'completed',
        language_default: lang,
      });
      await base44.auth.updateMe({ current_business_id: business.id });
      setStep(2);
    } catch (err) {
      setError(err.message || 'Could not create the business.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                i < step ? 'bg-primary text-primary-foreground' :
                i === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                'bg-muted text-muted-foreground')}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={cn('flex-1 max-w-16 h-0.5', i < step ? 'bg-primary' : 'bg-border')} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 0: Choose Vertical */}
        {step === 0 && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">{t('onboarding.whatTypeBusiness')}</h1>
              <p className="text-muted-foreground">{t('onboarding.setupRightTools')}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {VERTICALS.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { setVertical(key); setStep(1); }}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left hover:border-primary transition-all',
                    vertical === key ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
                  )}
                >
                  <Icon className="h-6 w-6 text-accent mb-2" />
                  <p className="text-sm font-medium leading-tight">{t(`onboarding.verticals.${key}`)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Business Details */}
        {step === 1 && (
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">{t('onboarding.tellUsAbout')}</h1>
              <p className="text-muted-foreground">{t('onboarding.canChangeLater')}</p>
            </div>
            <Card className="p-6 space-y-4">
              {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
              <div><Label>{t('onboarding.businessNameLabel')}</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Café Roma" className="mt-1" /></div>
              <div><Label>{t('onboarding.cityLabel')}</Label><Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="e.g. Beirut" className="mt-1" /></div>
              <div><Label>{t('onboarding.phoneLabel')}</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+961 XX XXX XXX" className="mt-1" /></div>
              <div>
                <Label>{t('onboarding.currencyLabel')}</Label>
                <select
                  value={form.currency}
                  onChange={e => setForm({...form, currency: e.target.value})}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {['USD', 'LBP', 'AED', 'SAR', 'EUR'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(0)}>{t('common.back')}</Button>
                <Button className="flex-1" disabled={!form.name.trim() || loading} onClick={handleCreate}>
                  {loading ? t('common.creating') : t('onboarding.createMyBusiness')}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Step 2: Done */}
        {step === 2 && (
          <div className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto mb-6">
              <Check className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-3">{t('onboarding.allSet')}</h1>
            <p className="text-muted-foreground mb-8">{t('onboarding.allSetDesc')}</p>
            <Button size="lg" className="rounded-full px-10" onClick={() => { window.location.href = '/dashboard'; }}>
              {t('onboarding.goToDashboard')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
