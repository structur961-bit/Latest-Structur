/* Supabase compatibility layer for the original Base44 UI. */
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SESSION_KEY = 'structur_supabase_session_v1';
let refreshPromise = null;

const entityConfig = {
  Business: { table: 'businesses', fields: ['name','slug','about','vertical','country','city','currency','timezone','phone','email','logo_url','cover_image_url','opening_hours','owner_user_id','status','storefront_published','language_default','onboarding_status','active_modules_json','billing_mode','white_label_mode','custom_domain'] },
  Location: { table: 'locations', fields: ['business_id','name','address','city','country','phone','email','is_active','opening_hours'] },
  Customer: { table: 'customers', fields: ['business_id','first_name','last_name','full_name','phone','email','notes','tags','loyalty_points','total_spent'] },
  Booking: { table: 'bookings', fields: ['business_id','customer_id','location_id','booking_type','party_size','table_label','start_at','end_at','status','notes','staff_user_id'] },
  Category: { table: 'categories', fields: ['business_id','name','description','image_url','sort_order','is_active'] },
  ProductService: { table: 'product_services', fields: ['business_id','category_id','name','description','price','currency','image_url','dietary_tags','variants','modifiers','is_active','is_featured','sort_order','type','sku','barcode','duration_minutes','duration_buffer_minutes','recipe'] },
  Order: { table: 'orders', fields: ['business_id','location_id','customer_id','order_type','delivery_address','status','subtotal','tax','service_charge','total','payment_status','table_label','notes'] },
  OrderItem: { table: 'order_items', fields: ['order_id','product_service_id','name_snapshot','quantity','unit_price','modifiers','notes'] },
  InventoryItem: { table: 'inventory_items', fields: ['business_id','name','sku','unit','quantity_on_hand','low_stock_threshold','cost','supplier_id','product_service_id','location_id','variant_key','supplier_name','supplier_contact','last_restocked_at','barcode'] },
  BusinessSettings: { table: 'business_settings', fields: ['business_id','reservation_rules','loyalty_rules','notification_rules','payment_rules','tax_settings','floor_plan','service_charge_percent','tax_rate_percent','tip_suggestions','delivery_zones','prep_time_by_category','receipt_footer_text','cancellation_policy','reviews'] },
  Payment: { table: 'payments', fields: ['business_id','order_id','customer_id','amount','currency','status','method','provider_reference','notes','paid_at'] },
  Campaign: { table: 'campaigns', fields: ['business_id','name','channel','campaign_type','status','sent_count','content','scheduled_at'] },
  LoyaltyLedger: { table: 'loyalty_ledger', fields: ['business_id','customer_id','points_delta','reason','source_type','source_id'] },
  StaffMembership: { table: 'staff_memberships', fields: ['business_id','user_id','user_email','user_name','role'] },
};

function requireSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.');
}

function loadSession() {
  return parseJson(localStorage.getItem(SESSION_KEY), null);
}

function saveSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

function storeAuthResponse(payload) {
  if (!payload?.access_token) return payload;
  const session = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: payload.expires_at || Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600),
    user: payload.user || loadSession()?.user || null,
  };
  saveSession(session);
  return session;
}

function captureSessionFromUrl() {
  if (!window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get('access_token');
  if (!accessToken) return null;
  const session = storeAuthResponse({
    access_token: accessToken,
    refresh_token: params.get('refresh_token'),
    expires_in: params.get('expires_in'),
  });
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
  return session;
}

async function authRequest(path, options = {}, accessToken = null) {
  requireSupabase();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken || SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? parseJson(text, {}) : {};
  if (!response.ok) {
    const error = new Error(body.msg || body.message || body.error_description || body.error || `Authentication request failed (${response.status})`);
    Object.assign(error, { status: response.status });
    throw error;
  }
  return body;
}

async function getAccessToken() {
  captureSessionFromUrl();
  let session = loadSession();
  if (!session?.access_token) return null;
  if (session.expires_at && session.expires_at > Math.floor(Date.now() / 1000) + 60) return session.access_token;
  if (!session.refresh_token) { saveSession(null); return null; }
  // AuthProvider and BusinessProvider can request a refresh at the same time.
  // Share the request so a rotated refresh token is only used once.
  if (!refreshPromise) {
    const refreshToken = session.refresh_token;
    refreshPromise = (async () => {
      try {
        const refreshed = await authRequest('token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) });
        if (loadSession()?.refresh_token !== refreshToken) return loadSession()?.access_token || null;
        return storeAuthResponse(refreshed).access_token;
      } catch (error) {
        if ((error.status === 400 || error.status === 401) && loadSession()?.refresh_token === refreshToken) saveSession(null);
        throw error;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function request(path, options = {}) {
  requireSupabase();
  const accessToken = await getAccessToken();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken || SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    const body = parseJson(text, {});
    throw Object.assign(new Error(body.message || body.details || body.hint || `Database request failed (${response.status})`), { status: response.status });
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

const parseJson = (value, fallback) => {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

function fromDatabase(entity, row) {
  if (!row) return row;
  const value = { ...row, created_date: row.created_at, updated_date: row.updated_at };
  if (entity === 'Business' || entity === 'Location') value.opening_hours_json = typeof row.opening_hours === 'string' ? row.opening_hours : JSON.stringify(row.opening_hours || {});
  if (entity === 'ProductService') {
    value.variants_json = JSON.stringify(row.variants || []);
    value.modifiers_json = JSON.stringify(row.modifiers || []);
    value.barcode_optional = row.barcode || '';
  }
  if (entity === 'OrderItem') {
    value.modifiers_json = JSON.stringify(row.modifiers || []);
    value.line_total = Number(row.quantity) * Number(row.unit_price);
  }
  if (entity === 'Order') {
    value.order_number = `ORD-${row.id.slice(0, 8).toUpperCase()}`;
    value.customer_notes = row.notes || '';
  }
  if (entity === 'BusinessSettings') {
    value.payment_rules_json = JSON.stringify(row.payment_rules || {});
    value.receipt_footer = row.receipt_footer_text || '';
  }
  if (entity === 'InventoryItem') {
    value.qty_on_hand = Number(row.quantity_on_hand || 0);
    value.reorder_level = Number(row.low_stock_threshold || 0);
  }
  if (entity === 'Payment') {
    value.payment_method = row.method;
    value.gateway = row.provider_reference;
  }
  for (const key of ['price','subtotal','tax','service_charge','total','unit_price','line_total','amount','total_spent','cost','tax_rate_percent','service_charge_percent']) {
    if (value[key] != null) value[key] = Number(value[key]);
  }
  return value;
}

function toDatabase(entity, input, creating = false) {
  const data = { ...input };
  delete data.id; delete data.created_at; delete data.updated_at; delete data.created_date; delete data.updated_date;
  if (entity === 'Business' || entity === 'Location') {
    if ('opening_hours_json' in data) data.opening_hours = parseJson(data.opening_hours_json, {});
    delete data.opening_hours_json;
  }
  if (creating && entity === 'Business' && data.storefront_published == null) data.storefront_published = false;
  if (entity === 'ProductService') {
    if ('variants_json' in data) data.variants = parseJson(data.variants_json, []);
    if ('modifiers_json' in data) data.modifiers = parseJson(data.modifiers_json, []);
    delete data.variants_json; delete data.modifiers_json;
    if ('barcode_optional' in data) data.barcode = data.barcode_optional || null;
    delete data.barcode_optional;
    if (creating) data.currency ||= 'USD';
  }
  if (entity === 'OrderItem') {
    if ('modifiers_json' in data) data.modifiers = parseJson(data.modifiers_json, []);
    delete data.modifiers_json;
  }
  if (entity === 'Order' && 'customer_notes' in data) data.notes = data.customer_notes;
  if (entity === 'BusinessSettings') {
    if ('payment_rules_json' in data) data.payment_rules = parseJson(data.payment_rules_json, {});
    if ('receipt_footer' in data) data.receipt_footer_text = data.receipt_footer;
  }
  if (entity === 'InventoryItem') {
    if ('qty_on_hand' in data) data.quantity_on_hand = Number(data.qty_on_hand);
    if ('reorder_level' in data) data.low_stock_threshold = Number(data.reorder_level);
    if (creating) { data.name ||= data.sku || 'Inventory item'; data.unit ||= 'unit'; }
    delete data.qty_on_hand; delete data.reorder_level;
  }
  if (entity === 'Payment') {
    if ('payment_method' in data) data.method = data.payment_method || 'cash';
    if ('gateway' in data) data.provider_reference = data.gateway || null;
    delete data.payment_method; delete data.gateway;
  }
  if (creating && entity === 'Booking' && !data.status) data.status = 'pending';
  if (creating && entity === 'Campaign' && !data.status) data.status = 'draft';
  const allowed = new Set(entityConfig[entity].fields);
  return Object.fromEntries(Object.entries(data).filter(([key, value]) => allowed.has(key) && value !== undefined));
}

function fieldName(entity, key) {
  if (key === 'created_date') return 'created_at';
  if (key === 'updated_date') return 'updated_at';
  if (entity === 'InventoryItem' && key === 'qty_on_hand') return 'quantity_on_hand';
  if (entity === 'InventoryItem' && key === 'reorder_level') return 'low_stock_threshold';
  return key;
}

function makeEntity(entity) {
  const { table } = entityConfig[entity];
  return {
    async filter(criteria = {}, sort = '-created_date', limit) {
      const params = new URLSearchParams({ select: '*' });
      Object.entries(criteria).forEach(([key, value]) => {
        if (value === undefined) return;
        const field = fieldName(entity, key);
        params.set(field, value === null ? 'is.null' : `eq.${value}`);
      });
      if (sort) {
        const desc = sort.startsWith('-');
        const field = fieldName(entity, desc ? sort.slice(1) : sort);
        params.set('order', `${field}.${desc ? 'desc' : 'asc'}${field === 'id' ? '' : ',id.asc'}`);
      }
      const rows = [];
      const maximum = limit ?? Infinity;
      while (rows.length < maximum) {
        const pageSize = Math.min(500, maximum - rows.length);
        params.set('limit', String(pageSize));
        params.set('offset', String(rows.length));
        const page = await request(`${table}?${params}`);
        rows.push(...(page || []));
        if (!page || page.length < pageSize) break;
      }
      return (rows || []).map(row => fromDatabase(entity, row));
    },
    async list(sort = '-created_date', limit) { return this.filter({}, sort, limit); },
    async create(input) {
      const rows = await request(table, { method: 'POST', body: JSON.stringify(toDatabase(entity, input, true)) });
      return fromDatabase(entity, rows?.[0]);
    },
    async update(id, input) {
      const rows = await request(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(toDatabase(entity, input)) });
      if (!rows?.length) throw new Error('Record was not found or you do not have permission to update it.');
      return fromDatabase(entity, rows?.[0]);
    },
    async delete(id) { await request(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }); return true; },
  };
}

const auth = {
  async getProviders() {
    const settings = await authRequest('settings');
    return ['google', 'microsoft', 'apple'].filter(provider => settings.external?.[provider === 'microsoft' ? 'azure' : provider]);
  },
  async me() {
    const accessToken = await getAccessToken();
    if (!accessToken) { const error = new Error('Not logged in'); Object.assign(error, { status: 401 }); throw error; }
    const user = await authRequest('user', { method: 'GET' }, accessToken);
    const session = loadSession();
    saveSession({ ...session, user });
    return authUser(user);
  },
  async register({ email, password }) {
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    const redirectTo = encodeURIComponent(`${window.location.origin}/login`);
    const payload = await authRequest(`signup?redirect_to=${redirectTo}`, { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), password, data: { role: 'business_owner' } }) });
    if (payload.access_token) storeAuthResponse(payload);
    return { ...payload, requires_confirmation: !payload.access_token };
  },
  async verifyOtp({ email, otpCode }) {
    const payload = await authRequest('verify', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), token: otpCode, type: 'signup' }) });
    return storeAuthResponse(payload);
  },
  async resendOtp(email) { return authRequest(`resend?redirect_to=${encodeURIComponent(`${window.location.origin}/login`)}`, { method: 'POST', body: JSON.stringify({ type: 'signup', email: email.trim().toLowerCase() }) }); },
  setToken() {},
  async loginViaEmailPassword(email, password) {
    const payload = await authRequest('token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), password }) });
    storeAuthResponse(payload);
    return authUser(payload.user);
  },
  async updateMe(values) {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('Not logged in');
    const current = loadSession()?.user?.user_metadata || {};
    const user = await authRequest('user', { method: 'PUT', body: JSON.stringify({ data: { ...current, ...values } }) }, accessToken);
    const session = loadSession(); saveSession({ ...session, user });
    return authUser(user);
  },
  async logout(redirect = '/') {
    const accessToken = loadSession()?.access_token;
    saveSession(null);
    try { if (accessToken) await authRequest('logout', { method: 'POST' }, accessToken); } catch { /* Session is cleared locally even if the server is unavailable. */ }
    window.location.href = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/login';
  },
  redirectToLogin() { window.location.href = '/login'; },
  async loginWithProvider(provider, redirect = '/dashboard') {
    requireSupabase();
    const returnTo = `${window.location.origin}${redirect}`;
    const supabaseProvider = provider === 'microsoft' ? 'azure' : provider;
    window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=${encodeURIComponent(supabaseProvider)}&redirect_to=${encodeURIComponent(returnTo)}`;
  },
  async resetPasswordRequest(email) {
    return authRequest(`recover?redirect_to=${encodeURIComponent(`${window.location.origin}/reset-password`)}`, { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase() }) });
  },
  async resetPassword({ newPassword }) {
    if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.');
    captureSessionFromUrl();
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('The recovery link is invalid or expired. Request a new one.');
    await authRequest('user', { method: 'PUT', body: JSON.stringify({ password: newPassword }) }, accessToken);
    return { success: true };
  },
};

function authUser(user) {
  // user_metadata is editable by the account holder and must not grant roles.
  return { id: user.id, email: user.email, role: user.app_metadata?.role || 'business_owner', current_business_id: user.user_metadata?.current_business_id || null };
}

const conversations = new Map();
const subscribers = new Map();
const assistantReply = agent => agent === 'booking_assistant'
  ? 'Share the preferred date, time, party size, name, and phone number. The owner can then confirm it in Bookings.'
  : agent === 'product_advisor'
    ? 'Tell me the customer preferences and budget. Use the current Products list for the final recommendation.'
    : 'Create an account with your email and password, confirm the email if requested, then create one business during onboarding.';

const agents = {
  async createConversation({ agent_name, metadata }) {
    const conversation = { id: crypto.randomUUID(), agent_name, metadata, messages: [] };
    conversations.set(conversation.id, conversation); return conversation;
  },
  subscribeToConversation(id, callback) { subscribers.set(id, callback); return () => subscribers.delete(id); },
  async addMessage(conversation, message) {
    const current = conversations.get(conversation.id) || conversation;
    current.messages.push({ ...message, created_date: new Date().toISOString() });
    subscribers.get(current.id)?.(current);
    if (message.role === 'user') {
      current.messages.push({ role: 'assistant', content: assistantReply(current.agent_name), created_date: new Date().toISOString() });
      subscribers.get(current.id)?.(current);
    }
    return current;
  },
};

const entities = Object.fromEntries(Object.keys(entityConfig).map(name => [name, makeEntity(name)]));

export const base44 = {
  entities,
  restaurant: {
    setOrderPaymentStatus: (orderId, status) => request('rpc/set_order_payment_status', { method: 'POST', body: JSON.stringify({ p_order_id: orderId, p_status: status }) }),
  },
  auth,
  agents,
  integrations: { Core: { UploadFile: async ({ file }) => {
    if (file.size > 1_500_000) throw new Error('Please choose a logo smaller than 1.5 MB.');
    const file_url = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    return { file_url };
  } } },
  functions: { invoke: async () => { throw new Error('Online card processing is disabled. Use cash, bank transfer, or a manual payment record.'); } },
};
