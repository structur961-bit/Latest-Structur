import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, CreditCard, Banknote, Building2, Wallet } from 'lucide-react';
import CardPaymentForm from './CardPaymentForm';

function parseVariants(json) {
  try { return JSON.parse(json) || []; } catch { return []; }
}
function parseModifiers(json) {
  try { return JSON.parse(json) || []; } catch { return []; }
}

const PAYMENT_METHOD_LABELS = {
  stripe: { en: 'Credit / Debit Card', ar: 'بطاقة ائتمانية / سحب', icon: CreditCard },
  cash: { en: 'Cash on Delivery', ar: 'الدفع نقداً', icon: Banknote },
  bank_transfer: { en: 'Bank Transfer', ar: 'تحويل بنكي', icon: Building2 },
  myfatoorah: { en: 'MyFatoorah', ar: 'ماي فاتورة', icon: CreditCard },
  tap: { en: 'Tap Payments', ar: 'Tap', icon: CreditCard },
  paytabs: { en: 'PayTabs', ar: 'PayTabs', icon: CreditCard },
  whish: { en: 'Whish Money', ar: 'Whish', icon: Wallet },
  areeba: { en: 'Areeba', ar: 'Areeba', icon: CreditCard },
  custom: { en: 'Other', ar: 'أخرى', icon: Wallet },
};

export default function StorefrontOrderModal({ product, business, inventoryMap, isRTL, stripeKeys, paymentConfig, onClose }) {
  const variants = parseVariants(product.variants_json);
  const modifiers = parseModifiers(product.modifiers_json);

  // Determine available payment methods from business config
  const availablePaymentMethods = Object.entries(paymentConfig || {})
    .filter(([, cfg]) => cfg?.is_enabled)
    .map(([id]) => id);

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [paymentMethod, setPaymentMethod] = useState(
    availablePaymentMethods.includes('stripe') ? 'stripe'
    : availablePaymentMethods[0] || 'cash'
  );
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState(null);

  const total = (product.price || 0) * quantity;

  const getVariantQty = (v) => {
    const sku = v.sku || v.value;
    return sku ? (inventoryMap[sku] ?? null) : null;
  };

  const handleModifierToggle = (mod) => {
    setSelectedModifiers(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  const validateForm = () => {
    if (!form.name) { toast.error(isRTL ? 'الرجاء إدخال اسمك' : 'Please enter your name'); return false; }
    if (variants.length > 0 && !selectedVariant) {
      toast.error(isRTL ? 'الرجاء اختيار الخيار المطلوب' : 'Please select a variant'); return false;
    }
    return true;
  };

  const createOrderRecord = async ({ paymentStatus = 'unpaid', gateway = '' } = {}) => {
    const customers = await base44.entities.Customer.filter({ business_id: business.id, phone: form.phone || '' });
    let customerId;
    if (customers.length > 0 && form.phone) {
      customerId = customers[0].id;
    } else {
      const cust = await base44.entities.Customer.create({
        business_id: business.id,
        full_name: form.name,
        phone: form.phone || '',
        email: form.email || '',
      });
      customerId = cust.id;
    }

    const order = await base44.entities.Order.create({
      business_id: business.id,
      customer_id: customerId,
      order_number: `ORD-${Date.now()}`,
      channel: 'web',
      status: paymentStatus === 'paid' ? 'confirmed' : 'pending',
      subtotal: total,
      total,
      currency: business.currency || 'USD',
      customer_notes: form.notes,
      payment_status: paymentStatus,
      payment_gateway: gateway,
    });

    await base44.entities.OrderItem.create({
      business_id: business.id,
      order_id: order.id,
      product_service_id: product.id,
      name_snapshot: product.name + (selectedVariant ? ` (${selectedVariant.label || selectedVariant.value})` : ''),
      quantity,
      unit_price: product.price || 0,
      variant_json: selectedVariant ? JSON.stringify(selectedVariant) : '',
      modifiers_json: selectedModifiers.length ? JSON.stringify(selectedModifiers) : '',
      line_total: total,
    });

    return order;
  };

  // For non-card payment methods (cash, bank transfer, etc.)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    const order = await createOrderRecord({ paymentStatus: 'unpaid', gateway: paymentMethod });
    setCompletedOrderId(order.id);
    setSubmitting(false);
    setDone(true);
  };

  // Called by CardPaymentForm after successful Stripe payment
  const handleCardSuccess = async ({ providerReference }) => {
    if (!validateForm()) return;
    const order = await createOrderRecord({ paymentStatus: 'paid', gateway: 'stripe' });
    setCompletedOrderId(order.id);
    setDone(true);
  };

  const showCardForm = paymentMethod === 'stripe' && stripeKeys?.publishable_key && stripeKeys?.secret_key;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="font-semibold text-lg">{isRTL ? 'تم إرسال طلبك!' : 'Order Placed!'}</p>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'سيتواصل معك الفريق قريباً.' : 'The team will get back to you shortly.'}
            </p>
            <Button onClick={onClose} className="mt-2">{isRTL ? 'إغلاق' : 'Close'}</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {product.description && (
              <p className="text-sm text-muted-foreground">{product.description}</p>
            )}

            {/* Variants */}
            {variants.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {isRTL ? 'الخيار' : 'Select Option'}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v, i) => {
                    const qty = getVariantQty(v);
                    const available = qty === null || qty > 0;
                    const isSelected = selectedVariant === v;
                    return (
                      <button
                        type="button"
                        key={i}
                        disabled={!available}
                        onClick={() => available && setSelectedVariant(v)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                          !available ? 'opacity-40 line-through cursor-not-allowed bg-muted border-border text-muted-foreground'
                          : isSelected ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary hover:text-primary'
                        }`}
                      >
                        {v.label || v.value || v.name}
                        {qty !== null && available && qty <= 3 && (
                          <span className="ml-1 text-xs text-amber-500">({qty} left)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modifiers */}
            {modifiers.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {isRTL ? 'الإضافات' : 'Add-ons'}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {modifiers.map((mod, i) => {
                    const isSelected = selectedModifiers.includes(mod);
                    return (
                      <button
                        type="button"
                        key={i}
                        onClick={() => handleModifierToggle(mod)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                          isSelected ? 'bg-secondary text-secondary-foreground border-primary' : 'bg-background border-border hover:border-primary'
                        }`}
                      >
                        {mod.label || mod.name || mod}
                        {mod.price && <span className="ml-1 text-xs text-muted-foreground">+{mod.price}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <Label className="text-sm font-medium mb-2 block">{isRTL ? 'الكمية' : 'Quantity'}</Label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-muted text-lg font-bold">−</button>
                <span className="w-8 text-center font-semibold">{quantity}</span>
                <button type="button" onClick={() => setQuantity(q => q + 1)}
                  className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-muted text-lg font-bold">+</button>
                {product.price != null && (
                  <span className="ml-2 text-sm font-bold text-primary">
                    {total.toFixed(2)} {business.currency || 'USD'}
                  </span>
                )}
              </div>
            </div>

            {/* Contact info */}
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium">{isRTL ? 'معلومات الاتصال' : 'Your Details'}</p>
              <div><Label className="text-xs">{isRTL ? 'الاسم *' : 'Name *'}</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="mt-1" /></div>
              <div><Label className="text-xs">{isRTL ? 'الهاتف' : 'Phone'}</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">{isRTL ? 'ملاحظات' : 'Notes'}</Label>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="mt-1" /></div>
            </div>

            {/* Payment method selector */}
            {availablePaymentMethods.length > 1 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium">{isRTL ? 'طريقة الدفع' : 'Payment Method'}</p>
                <div className="grid gap-2">
                  {availablePaymentMethods.map((methodId) => {
                    const meta = PAYMENT_METHOD_LABELS[methodId] || { en: methodId, ar: methodId, icon: CreditCard };
                    const Icon = meta.icon;
                    const isSelected = paymentMethod === methodId;
                    return (
                      <button
                        type="button"
                        key={methodId}
                        onClick={() => setPaymentMethod(methodId)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-start ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:border-primary'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {isRTL ? meta.ar : meta.en}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bank transfer details */}
            {paymentMethod === 'bank_transfer' && paymentConfig?.bank_transfer?.config && (
              <div className="p-3 bg-secondary/50 rounded-xl text-sm space-y-1 border">
                <p className="font-medium">{isRTL ? 'تفاصيل التحويل البنكي' : 'Bank Transfer Details'}</p>
                {paymentConfig.bank_transfer.config.bank_name && <p className="text-muted-foreground">{paymentConfig.bank_transfer.config.bank_name}</p>}
                {paymentConfig.bank_transfer.config.account_name && <p className="text-muted-foreground">{paymentConfig.bank_transfer.config.account_name}</p>}
                {paymentConfig.bank_transfer.config.account_number && (
                  <p className="font-mono font-semibold">{paymentConfig.bank_transfer.config.account_number}</p>
                )}
              </div>
            )}

            {/* Custom method notes */}
            {paymentMethod === 'custom' && paymentConfig?.custom?.config?.instructions && (
              <div className="p-3 bg-secondary/50 rounded-xl text-sm border">
                <p className="text-muted-foreground">{paymentConfig.custom.config.instructions}</p>
              </div>
            )}

            {/* Stripe card form */}
            {showCardForm ? (
              <div className="pt-2 border-t">
                <CardPaymentForm
                  stripePublishableKey={stripeKeys.publishable_key}
                  stripeSecretKey={stripeKeys.secret_key}
                  amount={total}
                  currency={business.currency || 'USD'}
                  description={`${product.name} — ${business.name}`}
                  onSuccess={handleCardSuccess}
                  isRTL={isRTL}
                />
              </div>
            ) : (
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isRTL ? 'تأكيد الطلب' : 'Place Order'}
              </Button>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}