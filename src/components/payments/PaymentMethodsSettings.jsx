import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/businessContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Settings2, Plus, Trash2, ExternalLink, CreditCard, Banknote, Smartphone, Building2, Wallet, Globe } from 'lucide-react';
import { toast } from 'sonner';

// All supported payment methods
const PAYMENT_GATEWAYS = [
  {
    id: 'cash',
    name: 'Cash',
    category: 'in_person',
    icon: Banknote,
    color: 'bg-green-50 text-green-700 border-green-200',
    description: 'Accept cash payments in person',
    fields: [],
  },
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    category: 'in_person',
    icon: Building2,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Accept direct bank transfers',
    fields: [
      { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. Blom Bank' },
      { key: 'account_name', label: 'Account Name', placeholder: 'Business name on account' },
      { key: 'account_number', label: 'Account Number', placeholder: 'IBAN or account number' },
    ],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'online',
    icon: CreditCard,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Accept cards worldwide via Stripe',
    docsUrl: 'https://dashboard.stripe.com/apikeys',
    fields: [
      { key: 'publishable_key', label: 'Publishable Key', placeholder: 'pk_live_...' },
      { key: 'secret_key', label: 'Secret Key', placeholder: 'sk_live_...', type: 'password' },
    ],
  },
  {
    id: 'paytabs',
    name: 'PayTabs',
    category: 'online',
    icon: Globe,
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    description: 'Popular online gateway for the MENA region',
    docsUrl: 'https://merchant.paytabs.com',
    fields: [
      { key: 'profile_id', label: 'Profile ID', placeholder: 'Your PayTabs Profile ID' },
      { key: 'server_key', label: 'Server Key', placeholder: 'Server key from dashboard', type: 'password' },
    ],
  },
  {
    id: 'tap',
    name: 'Tap Payments',
    category: 'online',
    icon: Smartphone,
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: 'Gulf-focused payment gateway (Tap)',
    docsUrl: 'https://dashboard.tap.company',
    fields: [
      { key: 'public_key', label: 'Public Key', placeholder: 'pk_live_...' },
      { key: 'secret_key', label: 'Secret Key', placeholder: 'sk_live_...', type: 'password' },
    ],
  },
  {
    id: 'myfatoorah',
    name: 'MyFatoorah',
    category: 'online',
    icon: Wallet,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Kuwait-based gateway, used across GCC & Levant',
    docsUrl: 'https://portal.myfatoorah.com',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Your MyFatoorah API key', type: 'password' },
    ],
  },
  {
    id: 'whish',
    name: 'Whish Money',
    category: 'wallet',
    icon: Smartphone,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Lebanese mobile wallet & payment app',
    fields: [
      { key: 'merchant_id', label: 'Merchant ID', placeholder: 'Your Whish Merchant ID' },
    ],
  },
  {
    id: 'areeba',
    name: 'Areeba',
    category: 'online',
    icon: CreditCard,
    color: 'bg-red-50 text-red-700 border-red-200',
    description: 'Lebanon & MENA card payment gateway',
    docsUrl: 'https://www.areeba.com',
    fields: [
      { key: 'merchant_id', label: 'Merchant ID', placeholder: 'Areeba Merchant ID' },
      { key: 'api_key', label: 'API Key', placeholder: 'API key', type: 'password' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom / Other',
    category: 'other',
    icon: Plus,
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    description: 'Add any other payment method manually',
    fields: [
      { key: 'method_name', label: 'Method Name', placeholder: 'e.g. Cheque, POS Terminal, ...' },
      { key: 'instructions', label: 'Instructions / Notes', placeholder: 'Any notes for your team' },
    ],
  },
];

const CATEGORY_LABELS = { online: 'Online Gateways', in_person: 'In-Person', wallet: 'Wallets', other: 'Other' };

function ConfigDialog({ gateway, existing, onSave, onClose }) {
  const [fields, setFields] = useState(() => {
    const stored = existing?.config || {};
    return gateway.fields.reduce((acc, f) => ({ ...acc, [f.key]: stored[f.key] || '' }), {});
  });
  const [enabled, setEnabled] = useState(existing?.is_enabled ?? true);

  const handleSave = async () => {
    if (await onSave({ gateway_id: gateway.id, is_enabled: enabled, config: fields })) onClose();
  };
  if (!['cash','bank_transfer','custom'].includes(gateway.id)) return <div className="space-y-4"><p>Online processing for {gateway.name} is unavailable. This method cannot be enabled or configured.</p><Button variant="outline" onClick={onClose}>Close</Button></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/30">
        <div className={`p-2.5 rounded-lg border ${gateway.color}`}>
          <gateway.icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-sm">{gateway.name}</p>
          <p className="text-xs text-muted-foreground">{gateway.description}</p>
        </div>
        {gateway.docsUrl && (
          <a href={gateway.docsUrl} target="_blank" rel="noreferrer" className="ms-auto text-xs text-primary flex items-center gap-1 hover:underline">
            Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {gateway.fields.map(f => (
        <div key={f.key}>
          <Label>{f.label}</Label>
          <Input
            type={f.type || 'text'}
            value={fields[f.key]}
            onChange={e => setFields({ ...fields, [f.key]: e.target.value })}
            placeholder={f.placeholder}
            className="mt-1"
          />
        </div>
      ))}

      {gateway.fields.length === 0 && (
        <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">No configuration needed — just toggle it on to make it available to your customers.</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Switch checked={enabled} onCheckedChange={setEnabled} />
        <Label>Enable this payment method</Label>
      </div>

      <div className="flex gap-2 pt-1">
        <Button className="flex-1" onClick={handleSave}>Save</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

export default function PaymentMethodsSettings() {
  const { currentBusiness } = useBusiness();
  const [settings, setSettings] = useState(null);
  const [configured, setConfigured] = useState({}); // gateway_id -> { is_enabled, config }
  const [dialogGateway, setDialogGateway] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentBusiness) return;
    base44.entities.BusinessSettings.filter({ business_id: currentBusiness.id }).then(data => {
      const s = data[0] || null;
      setSettings(s);
      if (s?.payment_rules_json) {
        try { setConfigured(JSON.parse(s.payment_rules_json)); } catch {}
      }
    });
  }, [currentBusiness]);

  const persist = async updated => {
    setSaving(true);
    try {
      const payload = { business_id: currentBusiness.id, payment_rules_json: JSON.stringify(updated) };
      const row = settings?.id ? await base44.entities.BusinessSettings.update(settings.id, payload) : await base44.entities.BusinessSettings.create(payload);
      setSettings(row); setConfigured(updated); return true;
    } catch(error) { toast.error(error.message || 'Could not save payment methods.'); return false; }
    finally { setSaving(false); }
  };
  const handleSaveGateway = async gatewayData => {
    if (!['cash','bank_transfer','custom'].includes(gatewayData.gateway_id)) { toast.error('Online processing is unavailable.'); return false; }
    const saved = await persist({ ...configured, [gatewayData.gateway_id]: { is_enabled: gatewayData.is_enabled, config: gatewayData.config } });
    if (saved) toast.success('Payment method saved');
    return saved;
  };
  const handleRemove = async gatewayId => {
    const updated = { ...configured }; delete updated[gatewayId];
    if (await persist(updated)) toast.success('Payment method removed');
  };
  const toggleEnabled = async (gatewayId, value) => {
    if (value && !['cash','bank_transfer','custom'].includes(gatewayId)) { toast.error('Online processing is unavailable.'); return; }
    await persist({ ...configured, [gatewayId]: { ...configured[gatewayId], is_enabled: value } });
  };

  // Group gateways by category
  const grouped = Object.entries(CATEGORY_LABELS).map(([cat, label]) => ({
    cat, label, gateways: PAYMENT_GATEWAYS.filter(g => g.category === cat),
  }));

  const configuredIds = Object.keys(configured);

  return (
    <div className="space-y-8">
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        Cash, bank transfer and manual records are available. Online payment processing is unavailable.
      </p>
      {/* Active methods summary */}
      {configuredIds.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Active Payment Methods</h3>
          <div className="flex flex-wrap gap-2">
            {configuredIds.map(id => {
              const gw = PAYMENT_GATEWAYS.find(g => g.id === id);
              if (!gw) return null;
              const isEnabled = configured[id]?.is_enabled;
              return (
                <div key={id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${isEnabled ? gw.color : 'bg-muted text-muted-foreground border-border'}`}>
                  <gw.icon className="h-3.5 w-3.5" />
                  {gw.name}
                  {isEnabled ? <CheckCircle2 className="h-3 w-3" /> : <span className="opacity-50">off</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grouped gateway list */}
      {grouped.map(({ cat, label, gateways }) => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{label}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gateways.map(gw => {
              const conf = configured[gw.id];
              const isAdded = !!conf;
              const isEnabled = conf?.is_enabled;
              return (
                <Card key={gw.id} className={`p-4 border transition-all ${isAdded ? 'border-primary/20 bg-primary/3' : 'hover:border-border/80'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${gw.color}`}>
                      <gw.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{gw.name}</p>
                        {isAdded && (
                          <Badge variant={isEnabled ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
                            {isEnabled ? 'Active' : 'Disabled'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{gw.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAdded && (
                        <>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={v => toggleEnabled(gw.id, v)}
                            className="scale-75"
                          />
                          <button
                            onClick={() => setDialogGateway(gw)}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Settings2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRemove(gw.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {!isAdded && (
                        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setDialogGateway(gw)}>
                          <Plus className="h-3.5 w-3.5" /> Add
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <Dialog open={!!dialogGateway} onOpenChange={() => setDialogGateway(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure {dialogGateway?.name}</DialogTitle>
          </DialogHeader>
          {dialogGateway && (
            <ConfigDialog
              gateway={dialogGateway}
              existing={configured[dialogGateway.id]}
              onSave={handleSaveGateway}
              onClose={() => setDialogGateway(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
