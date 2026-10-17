import React, { useState, useMemo } from 'react';
import StorefrontProductCard from './StorefrontProductCard';
import StorefrontOrderModal from './StorefrontOrderModal';

export default function StorefrontCatalog({ business, products, inventory, isRTL, stripeKeys, paymentConfig }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  // Build inventory map: sku -> quantity
  const inventoryMap = useMemo(() => {
    const map = {};
    inventory.forEach(item => {
      if (item.sku) map[item.sku] = item.quantity_in_stock ?? item.quantity ?? 0;
    });
    return map;
  }, [inventory]);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return cats;
  }, [products]);

  const filtered = activeCategory === 'all'
    ? products
    : products.filter(p => p.category === activeCategory);

  const sectionLabel = {
    restaurant: 'Our Menu', clothing: 'Collection', retail: 'Products',
    salon: 'Services', camp: 'Programmes', clinic: 'Services',
    gym: 'Classes & Memberships', education: 'Courses', homeServices: 'Services',
    events: 'Packages', carServices: 'Services', distributor: 'Catalogue',
  }[business.vertical] || 'Our Offerings';

  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      <h2 className="text-2xl font-bold mb-6">{sectionLabel}</h2>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className={`flex gap-2 flex-wrap mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeCategory === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:bg-muted'
            }`}
          >
            {isRTL ? 'الكل' : 'All'}
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(product => (
          <StorefrontProductCard
            key={product.id}
            product={product}
            inventoryMap={inventoryMap}
            currency={business.currency || 'USD'}
            isRTL={isRTL}
            onSelect={() => setSelectedProduct(product)}
          />
        ))}
      </div>

      {selectedProduct && (
        <StorefrontOrderModal
          product={selectedProduct}
          business={business}
          inventoryMap={inventoryMap}
          isRTL={isRTL}
          stripeKeys={stripeKeys}
          paymentConfig={paymentConfig}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </section>
  );
}