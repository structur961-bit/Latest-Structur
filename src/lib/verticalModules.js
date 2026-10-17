/**
 * Defines which dashboard modules are shown for each business vertical.
 * 'overview', 'customers', 'settings' are always shown for all verticals.
 */
export const VERTICAL_MODULES = {
  restaurant: ['products', 'orders', 'bookings', 'inventory', 'loyalty', 'payments', 'campaigns', 'reports'],
  clothing:   ['products', 'orders', 'inventory', 'customers', 'loyalty', 'payments', 'campaigns', 'reports'],
  retail:     ['products', 'orders', 'inventory', 'customers', 'loyalty', 'payments', 'campaigns', 'reports'],
  salon:      ['bookings', 'customers', 'products', 'loyalty', 'payments', 'campaigns', 'reports'],
  camp:       ['bookings', 'customers', 'products', 'payments', 'campaigns', 'reports'],
  clinic:     ['bookings', 'customers', 'products', 'payments', 'reports'],
  gym:        ['bookings', 'customers', 'products', 'loyalty', 'payments', 'campaigns', 'reports'],
  education:  ['bookings', 'customers', 'products', 'payments', 'reports'],
  homeServices: ['bookings', 'orders', 'customers', 'inventory', 'payments', 'reports'],
  events:     ['bookings', 'customers', 'products', 'payments', 'campaigns', 'reports'],
  carServices: ['bookings', 'orders', 'customers', 'inventory', 'payments', 'reports'],
  distributor: ['orders', 'products', 'inventory', 'customers', 'payments', 'campaigns', 'reports'],
};

// Always visible regardless of vertical
export const ALWAYS_VISIBLE = ['overview', 'customers', 'settings'];

/**
 * Returns the list of active modules for a business.
 * If the business has active_modules_json set, it is used as extra modules
 * on top of the vertical defaults. This allows per-business overrides
 * without affecting other businesses of the same vertical.
 *
 * @param {string} vertical - e.g. 'clinic'
 * @param {string|null} activeModulesJson - JSON array string from Business.active_modules_json
 */
export function getModulesForVertical(vertical, activeModulesJson = null) {
  const verticalModules = VERTICAL_MODULES[vertical] || [];
  let extraModules = [];
  if (activeModulesJson) {
    try { const parsed = JSON.parse(activeModulesJson); extraModules = Array.isArray(parsed) ? parsed.filter(value => typeof value === 'string') : []; } catch {}
  }
  return [...new Set([...ALWAYS_VISIBLE, ...verticalModules, ...extraModules])];
}