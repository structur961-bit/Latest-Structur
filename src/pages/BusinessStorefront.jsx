import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StorefrontHero from '@/components/storefront/StorefrontHero';
import StorefrontCatalog from '@/components/storefront/StorefrontCatalog';
import StorefrontBooking from '@/components/storefront/StorefrontBooking';
import StorefrontFooter from '@/components/storefront/StorefrontFooter';
import { Loader2 } from 'lucide-react';

export default function BusinessStorefront() {
  const { slug } = useParams();
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [stripeKeys, setStripeKeys] = useState(null); // { publishable_key, secret_key }
  const [paymentConfig, setPaymentConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadStorefront();
  }, [slug]);

  const loadStorefront = async () => {
    setLoading(true);
    // Find business by slug — read all publicly visible businesses
    const businesses = await base44.entities.Business.list();
    const biz = businesses.find(b => b.slug === slug);
    if (!biz) { setNotFound(true); setLoading(false); return; }

    const [prods, inv, locs, settingsArr] = await Promise.all([
      base44.entities.ProductService.filter({ business_id: biz.id, is_active: true }, 'category', 200),
      base44.entities.InventoryItem.filter({ business_id: biz.id }, 'name', 500),
      base44.entities.Location.filter({ business_id: biz.id, is_active: true }, 'name', 20),
      base44.entities.BusinessSettings.filter({ business_id: biz.id }),
    ]);

    // Extract payment config from settings
    try {
      const paymentRules = JSON.parse(settingsArr[0]?.payment_rules_json || '{}');
      setPaymentConfig(paymentRules);
      const stripe = paymentRules['stripe'];
      if (stripe?.is_enabled && stripe?.config?.publishable_key) {
        setStripeKeys({
          publishable_key: stripe.config.publishable_key,
          secret_key: stripe.config.secret_key,
        });
      }
    } catch {}

    setBusiness(biz);
    setProducts(prods);
    setInventory(inv);
    setLocations(locs);
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (notFound) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <p className="text-2xl font-bold">Business not found</p>
      <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
    </div>
  );

  const isRTL = business.language_default === 'ar';
  const showCatalog = products.length > 0;
  const showBooking = ['salon', 'clinic', 'gym', 'education', 'events', 'camp', 'homeServices', 'carServices'].includes(business.vertical);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`min-h-screen bg-background ${isRTL ? 'font-[Noto_Sans_Arabic,Inter,sans-serif]' : ''}`}>
      <StorefrontHero business={business} locations={locations} />
      {showCatalog && (
        <StorefrontCatalog
          business={business}
          products={products}
          inventory={inventory}
          isRTL={isRTL}
          stripeKeys={stripeKeys}
          paymentConfig={paymentConfig}
        />
      )}
      {showBooking && (
        <StorefrontBooking business={business} isRTL={isRTL} />
      )}
      <StorefrontFooter business={business} locations={locations} isRTL={isRTL} />
    </div>
  );
}