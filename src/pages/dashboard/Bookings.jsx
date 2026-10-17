import { toast } from 'sonner';
import { restaurantDateTime, restaurantDateTimeInput } from '@/lib/restaurantTime';
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/businessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import StatusBadge from '@/components/common/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, CalendarCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/lib/i18n';

const STATUSES = ['pending','confirmed','completed','cancelled','no_show'];
const TYPES = ['table_reservation','appointment','consultation','class','service_job'];


function BookingForm({ booking, customer, onSave, onClose }) {
  const { currentBusiness } = useBusiness();
  const { t } = useLanguage();
  const [form, setForm] = useState(booking ? { ...booking, start_at: restaurantDateTimeInput(booking.start_at, currentBusiness.timezone || 'UTC') } : { booking_type: 'table_reservation', start_at: '', notes: '', table_label: '', party_size: 1, status: 'pending', customer_name: '', customer_phone: '' });

  const handleSubmit = async (e) => {
    try {
    e.preventDefault();
    const startAt = restaurantDateTime(form.start_at, currentBusiness.timezone || 'UTC');
    if (!Number.isInteger(Number(form.party_size)) || Number(form.party_size) < 1) throw new Error('Party size must be a positive integer.');
    if (!booking && !form.customer_name.trim()) throw new Error('Customer name is required.');
    let customerId = booking?.customer_id || null;
    if (!booking) {
      const matches = form.customer_phone
        ? await base44.entities.Customer.filter({ business_id: currentBusiness.id, phone: form.customer_phone }, '-created_date', 1)
        : [];
      if (matches.length) customerId = matches[0].id;
      else {
        const customer = await base44.entities.Customer.create({ business_id: currentBusiness.id, full_name: form.customer_name, phone: form.customer_phone });
        customerId = customer.id;
      }
    }
    const data = { ...form, customer_id: customerId, business_id: currentBusiness.id, party_size: Number(form.party_size), start_at: startAt };
    if (booking?.id) await base44.entities.Booking.update(booking.id, data);
    else await base44.entities.Booking.create(data);
    onSave();
  
    } catch(error) { toast.error(error.message || 'Could not save this record.'); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!booking && <div className="grid grid-cols-2 gap-3"><div><Label>Customer name</Label><Input required value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} className="mt-1" /></div><div><Label>{t('common.phone')}</Label><Input value={form.customer_phone} onChange={e => setForm({...form, customer_phone: e.target.value})} className="mt-1" /></div></div>}
      {booking && customer && <div className="rounded-xl bg-muted/40 p-3"><p className="text-sm font-medium">{customer.full_name}</p><p className="text-xs text-muted-foreground">{customer.phone || customer.email || 'No contact details'}</p></div>}
      <div>
        <Label>{t('bookings.type')}</Label>
        <Select value={form.booking_type} onValueChange={v => setForm({...form, booking_type: v})}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map(type => <SelectItem key={type} value={type}>{t(`bookings.types.${type}`, type.replace('_', ' '))}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>{t('bookings.dateTime')}</Label><Input required type="datetime-local" value={form.start_at} onChange={e => setForm({...form, start_at: e.target.value})} className="mt-1" /></div>
      <div><Label>Table label</Label><Input value={form.table_label || ''} onChange={e => setForm({...form, table_label: e.target.value})} className="mt-1" /></div>
      <div><Label>{t('bookings.partySize')}</Label><Input type="number" min="1" value={form.party_size} onChange={e => setForm({...form, party_size: e.target.value})} className="mt-1" /></div>
      <div>
        <Label>{t('common.status')}</Label>
        <Select value={form.status || 'pending'} onValueChange={v => setForm({...form, status: v})}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(status => <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>{t('common.notes')}</Label><Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1" /></div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">{t('common.save')}</Button>
        <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
      </div>
    </form>
  );
}

export default function Bookings() {
  const { currentBusiness } = useBusiness();
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState({});
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const [data, customerRows] = await Promise.all([base44.entities.Booking.filter({ business_id: currentBusiness.id }, '-created_date', 100), base44.entities.Customer.filter({ business_id: currentBusiness.id }, '-created_date', 500)]);
    setBookings(data);
    setCustomers(Object.fromEntries(customerRows.map(customer => [customer.id, customer])));
  };

  useEffect(() => { if (currentBusiness) load(); }, [currentBusiness]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('bookings.title')}</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> {t('bookings.newBooking')}
        </Button>
      </div>
      <div className="space-y-3">
        {bookings.map(b => (
          <Card key={b.id} className="p-4 flex items-center justify-between cursor-pointer hover:shadow-sm" onClick={() => { setEditing(b); setShowForm(true); }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary"><CalendarCheck className="h-4 w-4 text-accent" /></div>
              <div>
                <p className="font-medium">{customers[b.customer_id]?.full_name || t(`bookings.types.${b.booking_type}`, b.booking_type?.replace('_', ' '))}</p>
                {customers[b.customer_id] && <p className="text-xs text-muted-foreground capitalize">{t(`bookings.types.${b.booking_type}`, b.booking_type?.replace('_', ' '))} · {customers[b.customer_id].phone || 'No phone'}</p>}
                <p className="text-xs text-muted-foreground">{b.start_at ? format(new Date(b.start_at), 'MMM d, yyyy h:mm a') : t('bookings.noTimeSet')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {b.party_size > 1 && <span className="text-xs text-muted-foreground">{b.party_size} {t('bookings.pax')}</span>}
              <StatusBadge status={b.status} />
            </div>
          </Card>
        ))}
        {bookings.length === 0 && <p className="text-center text-muted-foreground py-12">{t('bookings.noBookingsYet')}</p>}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('bookings.editBooking') : t('bookings.newBooking')}</DialogTitle></DialogHeader>
          <BookingForm booking={editing} customer={editing ? customers[editing.customer_id] : null} onSave={() => { setShowForm(false); load(); }} onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
