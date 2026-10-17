export function restaurantTotals(subtotal, settings = {}) {
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const serviceCharge = round(subtotal * Number(settings.service_charge_percent || 0) / 100);
  const tax = round((subtotal + serviceCharge) * Number(settings.tax_rate_percent || 0) / 100);
  return { subtotal, serviceCharge, tax, total: round(subtotal + serviceCharge + tax) };
}
