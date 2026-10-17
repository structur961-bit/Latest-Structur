import { useDashboardData } from '@/lib/useDashboardData';
import DashboardDataStatus from '@/components/dashboard/DashboardDataStatus';
import { toast } from 'sonner';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/businessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Package, Pencil, Trash2, Star } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import CategorySidebar from '@/components/products/CategorySidebar';
import ProductForm from '@/components/products/ProductForm';

export default function Products() {
  const { currentBusiness } = useBusiness();
  const { t } = useLanguage();
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: { items, categories }, loading, error, refresh: loadAll } = useDashboardData(currentBusiness?.id, { items: [], categories: [] }, async () => {
    const [items, categories] = await Promise.all([base44.entities.ProductService.filter({ business_id: currentBusiness.id }, '-created_date'),base44.entities.Category.filter({ business_id: currentBusiness.id }, 'sort_order')]); return { items, categories };
  });

  const filtered = items.filter(item => {
    const matchesCategory = selectedCategoryId === null || item.category_id === selectedCategoryId;
    const query = search.toLowerCase();
    const matchesSearch = !search || item.name?.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query) || item.sku?.toLowerCase().includes(query) || item.barcode_optional?.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await base44.entities.ProductService.delete(item.id);
      await loadAll();
    } catch (error) { toast.error(error.message || 'Could not delete this menu item.'); }
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="space-y-5">
      <DashboardDataStatus loading={loading} error={error} onRetry={loadAll} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('products.title')}</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> {t('products.addItem')}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Category Sidebar */}
        <CategorySidebar
          categories={categories}
          selected={selectedCategoryId}
          onSelect={setSelectedCategoryId}
          businessId={currentBusiness?.id}
          onCategoriesChanged={loadAll}
        />

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('products.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            {selectedCategory && (
              <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => { setEditing(null); setShowForm(true); }}>
                <Plus className="h-3.5 w-3.5" /> Add to "{selectedCategory.name}"
              </Button>
            )}
          </div>

          {selectedCategory && (
            <div className="pb-1 border-b border-border">
              <h2 className="text-lg font-semibold">{selectedCategory.name}</h2>
              {selectedCategory.description && <p className="text-sm text-muted-foreground">{selectedCategory.description}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(item => {
              const catName = categories.find(c => c.id === item.category_id)?.name;
              return (
                <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow group relative">
                  {item.image_url && <img src={item.image_url} alt="" className="h-32 w-full object-cover" />}
                  <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-secondary">
                        <Package className="h-4 w-4 text-accent" />
                      </div>
                      {item.is_featured && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
                    </div>
                    <Badge variant={item.is_active ? 'default' : 'secondary'} className="text-xs">
                      {t(`products.types.${item.type}`, item.type)}
                    </Badge>
                  </div>
                  <p className="font-semibold truncate">{item.name}</p>
                  {catName && <p className="text-xs text-muted-foreground mt-0.5">{catName}</p>}
                  {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                  <p className="text-lg font-bold text-accent mt-2">{item.price?.toFixed(2) || '0.00'} {item.currency || currentBusiness.currency}</p>
                  {(item.sku || item.barcode_optional) && <p className="mt-2 truncate text-[11px] text-muted-foreground">{item.sku && `SKU ${item.sku}`}{item.sku && item.barcode_optional && ' · '}{item.barcode_optional && `Barcode ${item.barcode_optional}`}</p>}

                  {/* Actions */}
                  <div className="absolute bottom-3 end-3 sm:bottom-auto sm:top-3 flex sm:hidden sm:group-hover:flex gap-1">
                    <button
                      onClick={() => { setEditing(item); setShowForm(true); }}
                      className="p-1.5 rounded-lg bg-background border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 rounded-lg bg-background border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  </div>
                </Card>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-16">
                <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {selectedCategoryId ? `No items in "${selectedCategory?.name}" yet.` : t('products.noItemsFound')}
                </p>
                <Button variant="outline" className="mt-4 gap-2" onClick={() => { setEditing(null); setShowForm(true); }}>
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('products.editItem') : t('products.addItem')}</DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editing}
            categories={categories}
            defaultCategoryId={selectedCategoryId}
            onSave={() => { setShowForm(false); loadAll(); }}
            onClose={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
