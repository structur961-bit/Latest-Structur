import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';

function parseVariants(json) {
  try { return JSON.parse(json) || []; } catch { return []; }
}

function getVariantAvailability(variants, inventoryMap) {
  if (!variants || variants.length === 0) return null;
  return variants.map(v => {
    const sku = v.sku || v.value;
    const qty = sku ? (inventoryMap[sku] ?? null) : null;
    return { ...v, available: qty === null ? true : qty > 0, qty };
  });
}

export default function StorefrontProductCard({ product, inventoryMap, currency, isRTL, onSelect }) {
  const variants = parseVariants(product.variants_json);
  const variantAvailability = getVariantAvailability(variants, inventoryMap);

  // Determine overall availability
  const hasVariants = variantAvailability && variantAvailability.length > 0;
  const someAvailable = hasVariants
    ? variantAvailability.some(v => v.available)
    : true; // If no variants tracked, assume available

  return (
    <div
      className={`bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group ${!someAvailable ? 'opacity-60' : ''}`}
      onClick={onSelect}
    >
      {/* Image */}
      <div className="h-44 bg-muted relative overflow-hidden">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center">
              <Tag className="h-10 w-10 text-muted-foreground/30" />
            </div>
        }
        {!someAvailable && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Badge className="bg-red-500 text-white border-0 text-xs">
              {isRTL ? 'غير متوفر' : 'Out of Stock'}
            </Badge>
          </div>
        )}
        {product.is_featured && someAvailable && (
          <Badge className="absolute top-2 left-2 bg-amber-500 text-white border-0 text-xs">
            {isRTL ? 'مميز' : 'Featured'}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{product.name}</p>
            {product.category && <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>}
          </div>
          {product.price != null && (
            <p className="font-bold text-sm text-primary shrink-0">
              {product.price} {currency}
            </p>
          )}
        </div>

        {product.description && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{product.description}</p>
        )}

        {product.duration_minutes && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {product.duration_minutes} {isRTL ? 'دقيقة' : 'min'}
          </div>
        )}

        {/* Variant availability chips */}
        {hasVariants && (
          <div className={`flex flex-wrap gap-1 mt-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {variantAvailability.map((v, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                  v.available
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-muted text-muted-foreground border-border line-through'
                }`}
              >
                {v.label || v.value || v.name}
              </span>
            ))}
          </div>
        )}

        <Button
          size="sm"
          className="w-full mt-3 text-xs"
          disabled={!someAvailable}
          onClick={e => { e.stopPropagation(); onSelect(); }}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          {isRTL ? 'اطلب الآن' : someAvailable ? 'Order / Book' : 'Unavailable'}
        </Button>
      </div>
    </div>
  );
}