import { toast } from 'sonner';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, FolderOpen, Pencil, Trash2, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

function CategoryForm({ category, businessId, onSave, onClose }) {
  const [form, setForm] = useState({ name: category?.name || '', description: category?.description || '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    try {
    e.preventDefault();
    setLoading(true);
    const data = { ...form, business_id: businessId };
    if (category?.id) await base44.entities.Category.update(category.id, data);
    else await base44.entities.Category.create(data);
    onSave();
    setLoading(false);
  
    } catch(error) { toast.error(error.message || 'Could not save this record.'); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Category Name</Label>
        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="mt-1" placeholder="e.g. Starters, Beverages, Clothing..." />
      </div>
      <div>
        <Label>Description (optional)</Label>
        <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" placeholder="Brief description" />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1" disabled={loading}>Save</Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

export default function CategorySidebar({ categories, selected, onSelect, businessId, onCategoriesChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState(null);

  const handleDelete = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"? Items in this category won't be deleted.`)) return;
    await base44.entities.Category.delete(cat.id);
    onCategoriesChanged();
    if (selected === cat.id) onSelect(null);
  };

  return (
    <div className="w-full sm:w-56 shrink-0 flex flex-col gap-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categories</span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingCat(null); setShowForm(true); }}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* All items tab */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium w-full text-start transition-colors',
          selected === null ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
        )}
      >
        <LayoutGrid className="h-4 w-4 shrink-0" />
        All Items
      </button>

      {categories.map(cat => (
        <div key={cat.id} className="group relative">
          <button
            onClick={() => onSelect(cat.id)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium w-full text-start transition-colors pe-14',
              selected === cat.id ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
            )}
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            <span className="truncate">{cat.name}</span>
          </button>
          <div className="absolute end-1 top-1/2 -translate-y-1/2 flex sm:hidden sm:group-hover:flex gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); setEditingCat(cat); setShowForm(true); }}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(cat); }}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}

      {categories.length === 0 && (
        <p className="text-xs text-muted-foreground px-3 py-2">No categories yet. Add one to organize your items.</p>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <CategoryForm
            category={editingCat}
            businessId={businessId}
            onSave={() => { setShowForm(false); onCategoriesChanged(); }}
            onClose={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}