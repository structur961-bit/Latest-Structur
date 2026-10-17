import { restaurantTotals } from '@/lib/restaurantTotals';
import React, { useEffect, useMemo, useState } from 'react';
import { restaurantDateTime, restaurantDate } from '@/lib/restaurantTime';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChefHat,
  Clock3,
  Loader2,
  MapPin,
  Minus,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  isSupabaseConfigured,
  loadRestaurant,
  placeRestaurantOrder,
  requestRestaurantBooking,
} from '@/lib/supabaseRestaurant';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80';

function money(value, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value || 0));
  } catch {
    return `${Number(value || 0).toFixed(2)} ${currency}`;
  }
}

function formatHours(hours, timeZone = 'UTC') {
  if (!hours) return null;
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone }).format(new Date()).toLowerCase();
  const today = hours[day] || hours[day.charAt(0).toUpperCase() + day.slice(1)];
  if (!today) return null;
  if (today.open === false || today.closed === true) return 'Closed today';
  const from = today.from || today.open_time;
  const to = today.to || today.close_time;
  return from && to ? `Open today · ${from}–${to}` : null;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-9 w-9 animate-spin mx-auto text-amber-400" />
        <p className="mt-4 text-sm text-stone-400">Preparing the menu…</p>
      </div>
    </div>
  );
}

function SetupScreen() {
  return <div className="min-h-screen bg-[#f7f3ec] flex items-center justify-center px-5"><div className="max-w-lg rounded-3xl bg-white border border-stone-200 p-8 text-center"><ChefHat className="h-10 w-10 mx-auto text-amber-700" /><h1 className="mt-5 text-2xl font-bold">Restaurant unavailable</h1><p className="mt-3 text-stone-600">This menu is currently unavailable. Contact the restaurant directly for orders or reservations.</p></div></div>;
}

function MenuCard({ item, currency, onAdd }) {
  return (
    <article className="group bg-white rounded-[1.4rem] border border-stone-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="relative h-44 overflow-hidden bg-stone-100">
        <img
          src={item.image_url || FALLBACK_IMAGE}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {item.is_featured && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-stone-950">
            <Sparkles className="h-3 w-3" /> Popular
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-stone-900 leading-tight">{item.name}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">{item.category}</p>
          </div>
          <p className="font-bold text-stone-950 whitespace-nowrap">{money(item.price, currency)}</p>
        </div>
        {item.description && <p className="mt-3 text-sm leading-6 text-stone-600 line-clamp-2">{item.description}</p>}
        {item.dietary_tags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.dietary_tags.map(tag => <span key={tag} className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">{tag}</span>)}
          </div>
        )}
        <Button onClick={() => onAdd(item)} className="mt-5 w-full rounded-xl bg-stone-950 hover:bg-amber-500 hover:text-stone-950">
          <Plus className="h-4 w-4" /> Add to order
        </Button>
      </div>
    </article>
  );
}

function CartPanel({ open, onClose, cart, setQuantity, removeItem, business, locations, onComplete }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '', orderType: 'pickup', address: '', locationId: locations[0]?.id || '' });
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [confirmedTotal, setConfirmedTotal] = useState(null);
  const subtotal = cart.reduce((sum, row) => sum + Number(row.item.price || 0) * row.quantity, 0);
  const totals = restaurantTotals(subtotal, business.checkout);

  function closePanel() {
    setOrderNumber('');
    onClose();
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Name and phone number are required');
      return;
    }
    if (form.orderType === 'delivery' && !form.address.trim()) {
      toast.error('Please add a delivery address');
      return;
    }
    setSubmitting(true);
    try {
      const result = await placeRestaurantOrder({
        business_id: business.id,
        location_id: form.locationId || null,
        customer: { full_name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() },
        order_type: form.orderType,
        delivery_address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        items: cart.map(row => ({ product_service_id: row.item.id, quantity: row.quantity })),
      });
      setOrderNumber(result?.order_number || 'received');
      setConfirmedTotal({ amount: result.total, currency: result.currency || business.currency });
      onComplete();
    } catch (error) {
      toast.error(error.message || 'Could not place the order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => !value && closePanel()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl gap-0">
        <DialogHeader className="p-6 border-b border-stone-200">
          <DialogTitle className="flex items-center gap-2 text-xl"><ShoppingBag className="h-5 w-5" /> Your order</DialogTitle>
        </DialogHeader>
        {orderNumber ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
            <h3 className="mt-4 text-2xl font-bold">Order placed</h3>
            <p className="mt-2 text-stone-600">Your order number is <strong>{orderNumber}</strong>. The restaurant will contact you shortly.</p>
            {confirmedTotal && <p className="mt-3 font-semibold">Confirmed total: {money(confirmedTotal.amount, confirmedTotal.currency)}</p>}
            <Button onClick={closePanel} className="mt-6 rounded-xl">Done</Button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="p-6 space-y-3">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-stone-500"><ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />Your cart is empty.</div>
              ) : cart.map(row => (
                <div key={row.item.id} className="flex items-center gap-3 rounded-2xl bg-stone-50 p-3">
                  <img src={row.item.image_url || FALLBACK_IMAGE} alt="" className="h-16 w-16 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{row.item.name}</p>
                    <p className="text-sm text-stone-500">{money(row.item.price, business.currency)}</p>
                  </div>
                  <div className="flex items-center rounded-xl border bg-white">
                    <button type="button" onClick={() => setQuantity(row.item.id, row.quantity - 1)} className="p-2"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-7 text-center text-sm font-semibold">{row.quantity}</span>
                    <button type="button" onClick={() => setQuantity(row.item.id, row.quantity + 1)} className="p-2"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button type="button" onClick={() => removeItem(row.item.id)} className="p-2 text-stone-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-stone-200 p-6 space-y-5">
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1.5">
                  {['pickup', 'delivery'].map(type => (
                    <button key={type} type="button" onClick={() => setForm({ ...form, orderType: type })} className={`rounded-xl px-4 py-2.5 text-sm font-semibold capitalize transition ${form.orderType === type ? 'bg-white shadow-sm text-stone-950' : 'text-stone-500'}`}>{type}</button>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1.5" /></div>
                  <div><Label>Phone *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1.5" /></div>
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1.5" /></div>
                  {locations.length > 1 && (
                    <div><Label>Branch</Label><select value={form.locationId} onChange={e => setForm({ ...form, locationId: e.target.value })} className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div>
                  )}
                  {form.orderType === 'delivery' && <div className="sm:col-span-2"><Label>Delivery address *</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="mt-1.5" /></div>}
                  <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1.5" rows={2} /></div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal, business.currency)}</span></div>
                  {totals.serviceCharge > 0 && <div className="flex justify-between"><span>Service charge ({business.checkout?.service_charge_percent}%)</span><span>{money(totals.serviceCharge, business.currency)}</span></div>}
                  {totals.tax > 0 && <div className="flex justify-between"><span>Tax ({business.checkout?.tax_rate_percent}%)</span><span>{money(totals.tax, business.currency)}</span></div>}
                </div>
                <div className="flex items-center justify-between text-lg font-bold"><span>Total</span><span>{money(totals.total, business.currency)}</span></div>
                <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 text-base font-bold">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Place order'}
                </Button>
                <p className="text-center text-xs text-stone-500">Payment is arranged directly with the restaurant.</p>
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReservationSection({ business, locations }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', date: '', time: '', partySize: 2, notes: '', locationId: locations[0]?.id || '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!form.name || !form.phone || !form.date || !form.time) {
      toast.error('Please complete the required reservation details');
      return;
    }
    setSubmitting(true);
    try {
      await requestRestaurantBooking({
        business_id: business.id,
        location_id: form.locationId || null,
        customer: { full_name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() },
        party_size: Number(form.partySize),
        start_at: restaurantDateTime(`${form.date}T${form.time}`, business.timezone || 'UTC'),
        notes: form.notes.trim() || null,
      });
      setDone(true);
    } catch (error) {
      toast.error(error.message || 'Could not request the reservation');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="reserve" className="bg-stone-950 text-white py-20 px-4">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.8fr_1.2fr] gap-12 items-center">
        <div>
          <span className="text-amber-400 uppercase tracking-[0.24em] text-xs font-bold">Reservations</span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">Save your table.</h2>
          <p className="mt-5 text-stone-400 leading-7 max-w-md">Choose your preferred date and time ({business.timezone || 'UTC'}). The restaurant will contact you to confirm availability.</p>
          <div className="mt-7 space-y-3 text-sm text-stone-300">
            {business.phone && <a href={`tel:${business.phone}`} className="flex items-center gap-3 hover:text-amber-400"><Phone className="h-4 w-4" />{business.phone}</a>}
            {(locations[0]?.address || business.city) && <p className="flex items-start gap-3"><MapPin className="h-4 w-4 mt-0.5" />{locations[0]?.address || business.city}</p>}
          </div>
        </div>
        <div className="rounded-[2rem] bg-white text-stone-950 p-6 sm:p-8 shadow-2xl">
          {done ? (
            <div className="py-12 text-center"><CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" /><h3 className="mt-4 text-2xl font-bold">Request received</h3><p className="mt-2 text-stone-600">We’ll contact you shortly to confirm your table.</p><Button onClick={() => setDone(false)} variant="outline" className="mt-6">Make another reservation</Button></div>
          ) : (
            <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><Label>Full name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Phone *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Date *</Label><Input type="date" min={restaurantDate(business.timezone || 'UTC')} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Time *</Label><Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Guests</Label><Input type="number" min="1" max="30" value={form.partySize} onChange={e => setForm({ ...form, partySize: Number(e.target.value) })} className="mt-1.5" /></div>
              {locations.length > 1 && <div><Label>Branch</Label><select value={form.locationId} onChange={e => setForm({ ...form, locationId: e.target.value })} className="mt-1.5 h-10 w-full rounded-md border px-3 text-sm">{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div>}
              <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="mt-1.5" /></div>
              <Button type="submit" disabled={submitting} className="sm:col-span-2 h-12 rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 font-bold">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request a table'}</Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default function RestaurantStorefront() {
  const { slug: routeSlug } = useParams();
  const slug = routeSlug || import.meta.env.VITE_RESTAURANT_SLUG || '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setData(null);
    setCart([]);
    setCartOpen(false);
    setActiveCategory('all');
    setSearch('');
    async function load() {
      if (!isSupabaseConfigured) {
        setError('The app is ready, but it still needs your Supabase public connection values.');
        setLoading(false);
        return;
      }
      try {
        const result = await loadRestaurant(slug);
        if (!active) return;
        if (!result) setError('This restaurant was not found or its storefront is not published.');
        else setData(result);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Could not load the restaurant.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [slug]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.products.filter(item => {
      const categoryMatch = activeCategory === 'all' || item.category_id === activeCategory;
      const searchMatch = !term || `${item.name} ${item.description || ''}`.toLowerCase().includes(term);
      return categoryMatch && searchMatch;
    });
  }, [data, activeCategory, search]);

  if (loading) return <LoadingScreen />;
  if (error || !data) return <SetupScreen />;

  const { business, locations, categories } = data;
  const cartCount = cart.reduce((sum, row) => sum + row.quantity, 0);
  const cartTotal = cart.reduce((sum, row) => sum + Number(row.item.price || 0) * row.quantity, 0);
  const hours = formatHours(business.opening_hours, business.timezone || 'UTC');

  function addItem(item) {
    setCart(previous => {
      const found = previous.find(row => row.item.id === item.id);
      return found
        ? previous.map(row => row.item.id === item.id ? { ...row, quantity: Math.min(99, row.quantity + 1) } : row)
        : [...previous, { item, quantity: 1 }];
    });
    toast.success(`${item.name} added`);
  }

  function setQuantity(id, quantity) {
    if (quantity < 1) setCart(previous => previous.filter(row => row.item.id !== id));
    else setCart(previous => previous.map(row => row.item.id === id ? { ...row, quantity: Math.min(99, quantity) } : row));
  }

  return (
    <div className="min-h-screen bg-[#f7f3ec] text-stone-950">
      <header className="relative min-h-[520px] overflow-hidden bg-stone-950 text-white">
        <img src={business.cover_image_url || FALLBACK_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/75 to-stone-950/10" />
        <nav className="relative z-10 max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-3">
            {business.logo_url ? <img src={business.logo_url} alt={business.name} className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/20" /> : <span className="h-11 w-11 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center"><ChefHat className="h-6 w-6" /></span>}
            <span className="font-bold text-lg">{business.name}</span>
          </a>
          <div className="flex items-center gap-2">
            <a href="#reserve" className="hidden sm:inline-flex rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10">Reserve</a>
            <Button onClick={() => setCartOpen(true)} className="rounded-xl bg-amber-400 text-stone-950 hover:bg-amber-300"><ShoppingBag className="h-4 w-4" /> Cart {cartCount > 0 && `(${cartCount})`}</Button>
          </div>
        </nav>
        <div id="top" className="relative z-10 max-w-6xl mx-auto px-4 pt-20 pb-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-amber-300"><UtensilsCrossed className="h-3.5 w-3.5" /> Restaurant & café</span>
          <h1 className="mt-6 max-w-3xl text-5xl sm:text-7xl font-bold tracking-tight leading-[0.98]">{business.name}</h1>
          {business.about && <p className="mt-6 max-w-xl text-lg text-stone-300 leading-8">{business.about}</p>}
          <div className="mt-8 flex flex-wrap gap-4 text-sm text-stone-300">
            {(locations[0]?.address || business.city) && <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-400" />{locations[0]?.address || business.city}</span>}
            {hours && <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-400" />{hours}</span>}
            {business.phone && <a href={`tel:${business.phone}`} className="flex items-center gap-2 hover:text-white"><Phone className="h-4 w-4 text-amber-400" />{business.phone}</a>}
          </div>
          <div className="mt-9 flex gap-3"><a href="#menu" className="rounded-xl bg-amber-400 px-6 py-3 font-bold text-stone-950 hover:bg-amber-300">Explore menu</a><a href="#reserve" className="rounded-xl border border-white/25 px-6 py-3 font-bold hover:bg-white/10">Book a table</a></div>
        </div>
      </header>

      <main id="menu" className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div><span className="text-amber-700 uppercase tracking-[0.24em] text-xs font-bold">Fresh from the kitchen</span><h2 className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight">Our menu</h2></div>
          <div className="relative w-full lg:w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search the menu" className="pl-10 h-11 rounded-xl bg-white" /></div>
        </div>
        <div className="sticky top-0 z-20 -mx-4 mt-8 px-4 py-4 bg-[#f7f3ec]/95 backdrop-blur border-y border-stone-200/70 flex gap-2 overflow-x-auto">
          <button onClick={() => setActiveCategory('all')} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${activeCategory === 'all' ? 'bg-stone-950 text-white' : 'bg-white border border-stone-200'}`}>All</button>
          {categories.map(category => <button key={category.id} onClick={() => setActiveCategory(category.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${activeCategory === category.id ? 'bg-stone-950 text-white' : 'bg-white border border-stone-200'}`}>{category.name}</button>)}
        </div>
        {filteredItems.length > 0 ? <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{filteredItems.map(item => <MenuCard key={item.id} item={item} currency={business.currency || 'USD'} onAdd={addItem} />)}</div> : <div className="mt-10 rounded-3xl border border-dashed border-stone-300 bg-white/60 py-16 text-center"><ChefHat className="h-10 w-10 mx-auto text-stone-300" /><p className="mt-3 font-semibold">No menu items found</p><p className="text-sm text-stone-500 mt-1">Try another category or add menu items in Supabase.</p></div>}
      </main>

      <ReservationSection key={business.id} business={business} locations={locations} />

      <footer className="bg-[#171714] text-stone-400 px-4 py-8 border-t border-white/10"><div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm"><p>© {new Date().getFullYear()} {business.name}</p><p>{business.city}{business.country ? `, ${business.country}` : ''}</p></div></footer>

      {cartCount > 0 && !cartOpen && <button onClick={() => setCartOpen(true)} className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 rounded-2xl bg-stone-950 text-white px-5 py-3.5 shadow-2xl"><span className="h-7 w-7 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center text-sm font-bold">{cartCount}</span><span className="font-semibold">View order</span><span className="text-amber-300 font-bold">{money(cartTotal, business.currency)}</span></button>}
      <CartPanel key={business.id} open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} setQuantity={setQuantity} removeItem={id => setCart(previous => previous.filter(row => row.item.id !== id))} business={business} locations={locations} onComplete={() => setCart([])} />
    </div>
  );
}
