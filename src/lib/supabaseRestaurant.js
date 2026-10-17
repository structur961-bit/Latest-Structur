const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

async function request(path, options = {}) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Supabase request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.message || body.hint || body.details || message;
    } catch {
      // Keep the HTTP fallback when Supabase does not return JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function query(table, params) {
  if (params.limit) return request(`${table}?${new URLSearchParams(params).toString()}`);
  const rows = [];
  while (true) {
    const page = await request(`${table}?${new URLSearchParams({ ...params, limit: '500', offset: String(rows.length) }).toString()}`);
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

function normalizeBusiness(business) {
  return {
    ...business,
    language_default: business.language_default || 'en',
    opening_hours_json: JSON.stringify(business.opening_hours || {}),
  };
}

export async function loadRestaurant(slug) {
  const businessQuery = {
    select: '*',
    vertical: 'eq.restaurant',
    storefront_published: 'eq.true',
    order: 'created_at.asc',
    limit: '1',
  };

  if (slug) businessQuery.slug = `eq.${slug}`;
  const businesses = await query('restaurant_public_businesses', businessQuery);

  const business = businesses?.[0];
  if (!business) return null;

  const [locations, categories, menuItems, checkout] = await Promise.all([
    query('restaurant_public_locations', {
      select: '*',
      business_id: `eq.${business.id}`,
      is_active: 'eq.true',
      order: 'name.asc,id.asc',
    }),
    query('restaurant_public_categories', {
      select: '*',
      business_id: `eq.${business.id}`,
      is_active: 'eq.true',
      order: 'sort_order.asc,name.asc,id.asc',
    }),
    query('restaurant_public_products', {
      select: '*',
      business_id: `eq.${business.id}`,
      is_active: 'eq.true',
      order: 'sort_order.asc,name.asc,id.asc',
    }),
    request('rpc/get_restaurant_checkout_settings', { method: 'POST', body: JSON.stringify({ p_business_id: business.id }) }),
  ]);

  const categoryMap = Object.fromEntries((categories || []).map(category => [category.id, category.name]));
  const products = (menuItems || []).map(item => ({
    ...item,
    category: categoryMap[item.category_id] || 'Menu',
    variants_json: JSON.stringify(item.variants || []),
    modifiers_json: JSON.stringify(item.modifiers || []),
  }));

  return {
    business: { ...normalizeBusiness(business), checkout },
    locations: locations || [],
    categories: categories || [],
    products,
  };
}

export function placeRestaurantOrder(payload) {
  return request('rpc/place_restaurant_order', {
    method: 'POST',
    body: JSON.stringify({ p_payload: payload }),
  });
}

export function requestRestaurantBooking(payload) {
  return request('rpc/request_restaurant_booking', {
    method: 'POST',
    body: JSON.stringify({ p_payload: payload }),
  });
}
