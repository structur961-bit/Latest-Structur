import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/businessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, AlertTriangle, Barcode, Loader2, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import BarcodeScannerDialog from '@/components/products/BarcodeScannerDialog';

function InventoryForm({ item, products, onSave, onClose, onDelete }) {
  const { currentBusiness } = useBusiness();
  const { t } = useLanguage();
  const [form, setForm] = useState(item || { name: '', product_service_id: '', sku: '', barcode: '', unit: 'unit', qty_on_hand: 0, reorder_level: 5, cost: '', supplier_name: '' });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const chooseProduct = productId => {
    const product = products.find(row => row.id === productId);
    setForm(current => ({ ...current, product_service_id: productId === 'none' ? '' : productId, name: product?.name || current.name, sku: product?.sku || current.sku, barcode: product?.barcode_optional || current.barcode }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const data = { ...form, product_service_id: form.product_service_id || null, business_id: currentBusiness.id, qty_on_hand: Number(form.qty_on_hand) || 0, reorder_level: Number(form.reorder_level) || 0, cost: form.cost === '' ? null : Number(form.cost) };
    try {
      if (item?.id) await base44.entities.InventoryItem.update(item.id, data);
      else await base44.entities.InventoryItem.create(data);
      onSave();
    } catch (err) {
      setError(err.message || 'Could not save the inventory item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <div><Label>Linked menu item</Label><Select value={form.product_service_id || 'none'} onValueChange={chooseProduct}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not linked</SelectItem>{products.map(product => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Inventory item name *</Label><Input required value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="mt-1" placeholder="e.g. Chicken breast" /></div>
      <div className="grid grid-cols-2 gap-3"><div><Label>{t('inventory.sku')}</Label><Input value={form.sku || ''} onChange={e => setForm({...form, sku: e.target.value})} className="mt-1" /></div><div><Label>Barcode</Label><div className="mt-1 flex gap-2"><Input value={form.barcode || ''} onChange={e => setForm({...form, barcode: e.target.value})} /><Button type="button" variant="outline" size="icon" onClick={() => setScannerOpen(true)}><Barcode className="h-4 w-4" /></Button></div></div></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>{t('inventory.qtyOnHand')}</Label><Input type="number" min="0" step="any" value={form.qty_on_hand} onChange={e => setForm({...form, qty_on_hand: e.target.value})} className="mt-1" /></div>
        <div><Label>{t('inventory.reorderLevel')}</Label><Input type="number" min="0" step="any" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: e.target.value})} className="mt-1" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3"><div><Label>Unit</Label><Input value={form.unit || ''} onChange={e => setForm({...form, unit: e.target.value})} className="mt-1" placeholder="kg, bottle, unit" /></div><div><Label>Unit cost</Label><Input type="number" min="0" step="0.01" value={form.cost ?? ''} onChange={e => setForm({...form, cost: e.target.value})} className="mt-1" /></div></div>
      <div><Label>{t('inventory.supplier')}</Label><Input value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} className="mt-1" /></div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : t('common.save')}</Button>
        <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
        {item?.id && <Button type="button" variant="destructive" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>}
      </div>
      <BarcodeScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onDetected={code => setForm(current => ({ ...current, barcode: code }))} />
    </form>
  );
}

export default function Inventory() {
  const { currentBusiness } = useBusiness();
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const [data, menu] = await Promise.all([base44.entities.InventoryItem.filter({ business_id: currentBusiness.id }, '-created_date', 200), base44.entities.ProductService.filter({ business_id: currentBusiness.id }, 'name', 500)]);
    setItems(data);
    setProducts(menu);
  };

  useEffect(() => { if (currentBusiness) load(); }, [currentBusiness]);

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()) || i.sku?.toLowerCase().includes(search.toLowerCase()) || i.barcode?.includes(search) || i.supplier_name?.toLowerCase().includes(search.toLowerCase()));
  const lowStock = items.filter(i => i.qty_on_hand <= i.reorder_level).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('inventory.title')}</h1>
          {lowStock > 0 && (
            <div className="flex items-center gap-1.5 text-amber-600 text-sm mt-1">
              <AlertTriangle className="h-4 w-4" />
              {t('inventory.lowStockAlert').replace('{n}', lowStock)}
            </div>
          )}
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> {t('inventory.addItem')}
        </Button>
      </div>
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t('inventory.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="ps-9" />
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-start p-3 font-medium">Item</th>
              <th className="text-start p-3 font-medium">{t('inventory.sku')}</th>
              <th className="text-start p-3 font-medium">{t('inventory.qtyOnHand')}</th>
              <th className="text-start p-3 font-medium">{t('inventory.reorderLevel')}</th>
              <th className="text-start p-3 font-medium">{t('inventory.supplier')}</th>
              <th className="text-start p-3 font-medium">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-b border-border hover:bg-muted/30 cursor-pointer" onClick={() => { setEditing(item); setShowForm(true); }}>
                <td className="p-3"><p className="font-medium">{item.name || 'Inventory item'}</p>{item.barcode && <p className="text-xs text-muted-foreground">{item.barcode}</p>}</td>
                <td className="p-3">{item.sku || '—'}</td>
                <td className="p-3">{item.qty_on_hand} {item.unit || ''}</td>
                <td className="p-3 text-muted-foreground">{item.reorder_level}</td>
                <td className="p-3 text-muted-foreground">{item.supplier_name || '—'}</td>
                <td className="p-3">
                  {item.qty_on_hand <= item.reorder_level
                    ? <Badge variant="destructive" className="text-xs">{t('inventory.lowStock')}</Badge>
                    : <Badge variant="secondary" className="text-xs">{t('inventory.ok')}</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">{t('inventory.noItemsFound')}</p>}
      </Card>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('inventory.editItem') : t('inventory.addInventoryItem')}</DialogTitle></DialogHeader>
          <InventoryForm item={editing} products={products} onSave={() => { setShowForm(false); load(); }} onClose={() => setShowForm(false)} onDelete={async () => { if (confirm(`Delete "${editing?.name || 'this item'}"?`)) { await base44.entities.InventoryItem.delete(editing.id); setShowForm(false); load(); } }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
