import RecipeEditor from './RecipeEditor';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/businessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/lib/i18n';
import { Barcode, Loader2 } from 'lucide-react';
import BarcodeScannerDialog from './BarcodeScannerDialog';

const TYPES = ['product', 'service', 'menu_item', 'class', 'programme', 'package'];

export default function ProductForm({ product, categories, defaultCategoryId, onSave, onClose }) {
  const { currentBusiness } = useBusiness();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: product?.name || '',
    recipe: product?.recipe || [],
    type: product?.type || (currentBusiness?.vertical === 'restaurant' ? 'menu_item' : 'product'),
    price: product?.price ?? '',
    category_id: product?.category_id || defaultCategoryId || '',
    description: product?.description || '',
    sku: product?.sku || '',
    barcode_optional: product?.barcode_optional || '',
    image_url: product?.image_url || '',
    dietary_tags: (product?.dietary_tags || []).join(', '),
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
  });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    if (!form.name.trim() || !Number.isFinite(Number(form.price)) || Number(form.price) < 0 || !Array.isArray(form.recipe) || form.recipe.some(row => !row.inventory_item_id || !Number.isFinite(Number(row.quantity)) || Number(row.quantity) <= 0)) {
      setError('Enter a name, a non-negative price, and valid recipe ingredients.'); setSaving(false); return;
    }
    const data = {
      ...form,
      business_id: currentBusiness.id,
      name: form.name.trim(),
      price: Number(form.price),
      recipe: form.recipe.map(row => ({inventory_item_id: row.inventory_item_id, quantity: Number(row.quantity)})),
      category_id: form.category_id || null,
      currency: currentBusiness.currency || 'USD',
      barcode_optional: form.barcode_optional.trim() || null,
      dietary_tags: form.dietary_tags.split(',').map(tag => tag.trim()).filter(Boolean),
    };
    try {
      if (product?.id) await base44.entities.ProductService.update(product.id, data);
      else await base44.entities.ProductService.create(data);
      onSave();
    } catch (err) {
      setError(err.message?.includes('duplicate') ? 'This barcode is already assigned to another product.' : (err.message || 'Could not save this item.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <div>
        <Label>Name *</Label>
        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="mt-1" placeholder="Item name" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Type</Label>
          <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map(type => <SelectItem key={type} value={type}>{t(`products.types.${type}`, type)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Price</Label>
          <Input type="number" step="0.01" min="0" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="mt-1" placeholder="0.00" />
        </div>
      </div>

      <div>
        <Label>Category</Label>
        <Select value={form.category_id || 'none'} onValueChange={v => setForm({ ...form, category_id: v === 'none' ? '' : v })}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="No category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No category</SelectItem>
            {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 resize-none" rows={3} placeholder="Optional description" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>SKU / Code</Label>
          <Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="mt-1" placeholder="Internal code" />
        </div>
        <div>
          <Label>Barcode</Label>
          <div className="mt-1 flex gap-2"><Input value={form.barcode_optional} onChange={e => setForm({ ...form, barcode_optional: e.target.value })} placeholder="EAN / UPC" /><Button type="button" size="icon" variant="outline" onClick={() => setScannerOpen(true)} aria-label="Scan barcode"><Barcode className="h-4 w-4" /></Button></div>
        </div>
      </div>

      <div><Label>Menu image URL</Label><Input type="url" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} className="mt-1" placeholder="https://…" /></div>
      {currentBusiness?.vertical === 'restaurant' && <div><Label>Dietary tags</Label><Input value={form.dietary_tags} onChange={e => setForm({ ...form, dietary_tags: e.target.value })} className="mt-1" placeholder="Vegetarian, Gluten-free, Spicy" /><p className="mt-1 text-xs text-muted-foreground">Separate tags with commas.</p></div>}

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
          <Label>Active</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.is_featured} onCheckedChange={v => setForm({ ...form, is_featured: v })} />
          <Label>Featured</Label>
        </div>
      </div>

      {currentBusiness?.vertical === 'restaurant' && <RecipeEditor businessId={currentBusiness.id} value={form.recipe} onChange={recipe => setForm({...form,recipe})} />}
      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1" disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : 'Save Item'}</Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
      <BarcodeScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onDetected={code => setForm(current => ({ ...current, barcode_optional: code }))} />
    </form>
  );
}
