import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Calendar, CheckCircle2, Loader2 } from 'lucide-react';

const BOOKING_TYPE_MAP = {
  salon: 'appointment', clinic: 'consultation', gym: 'class',
  education: 'class', events: 'consultation', camp: 'class',
  homeServices: 'service_job', carServices: 'service_job',
};

export default function StorefrontBooking({ business, isRTL }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', date: '', time: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.date) {
      toast.error(isRTL ? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill in required fields');
      return;
    }
    setSubmitting(true);

    const customers = await base44.entities.Customer.filter({ business_id: business.id, phone: form.phone });
    let customerId;
    if (customers.length > 0) {
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

    const startAt = form.time ? `${form.date}T${form.time}` : `${form.date}T09:00`;
    await base44.entities.Booking.create({
      business_id: business.id,
      customer_id: customerId,
      booking_type: BOOKING_TYPE_MAP[business.vertical] || 'appointment',
      start_at: startAt,
      status: 'pending',
      notes: form.notes,
    });

    setSubmitting(false);
    setDone(true);
  };

  const labels = {
    title: isRTL ? 'احجز موعداً' : 'Book an Appointment',
    subtitle: isRTL ? 'أرسل طلب حجزك وسنتواصل معك للتأكيد.' : 'Send a booking request and we\'ll confirm shortly.',
    name: isRTL ? 'الاسم الكامل *' : 'Full Name *',
    phone: isRTL ? 'رقم الهاتف' : 'Phone',
    email: isRTL ? 'البريد الإلكتروني' : 'Email',
    date: isRTL ? 'التاريخ المفضل *' : 'Preferred Date *',
    time: isRTL ? 'الوقت المفضل' : 'Preferred Time',
    notes: isRTL ? 'ملاحظات إضافية' : 'Additional Notes',
    submit: isRTL ? 'إرسال الطلب' : 'Request Booking',
  };

  return (
    <section className="bg-muted/40 border-t border-border">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{labels.title}</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-8">{labels.subtitle}</p>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="font-semibold text-lg">{isRTL ? 'تم إرسال طلب الحجز!' : 'Booking Request Sent!'}</p>
            <p className="text-sm text-muted-foreground">{isRTL ? 'سيتواصل معك الفريق قريباً للتأكيد.' : 'We\'ll be in touch to confirm your booking.'}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs">{labels.name}</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">{labels.phone}</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">{labels.email}</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">{labels.date}</Label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">{labels.time}</Label>
                <Input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">{labels.notes}</Label>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} className="mt-1" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : labels.submit}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}