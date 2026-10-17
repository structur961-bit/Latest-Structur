import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { business_id, category, search } = await req.json();

    if (!business_id) {
      return Response.json({ error: 'business_id is required' }, { status: 400 });
    }

    // Fetch active ProductService items
    const psFilter = { business_id, is_active: true };
    if (category) psFilter.category = category;

    const services = await base44.asServiceRole.entities.ProductService.filter(psFilter, 'name', 100);

    // Fetch inventory items with stock
    const invFilter = { business_id };
    const inventory = await base44.asServiceRole.entities.InventoryItem.filter(invFilter, 'name', 100);

    // Simple search filter if provided
    const matchText = (text) => !search || (text || '').toLowerCase().includes(search.toLowerCase());

    const filteredServices = services
      .filter(i => matchText(i.name) || matchText(i.description) || matchText(i.category))
      .map(i => ({
        id: i.id,
        source: 'product_service',
        name: i.name,
        type: i.type,
        description: i.description || null,
        category: i.category || null,
        price: i.price || null,
        currency: i.currency || 'USD',
        duration_minutes: i.duration_minutes || null,
        is_featured: i.is_featured || false,
      }));

    const filteredInventory = inventory
      .filter(i => matchText(i.name) || matchText(i.description) || matchText(i.category))
      .map(i => ({
        id: i.id,
        source: 'inventory',
        name: i.name,
        description: i.description || null,
        category: i.category || null,
        quantity_on_hand: i.quantity_on_hand || 0,
        unit: i.unit || null,
        cost_price: i.cost_price || null,
      }));

    return Response.json({
      products_and_services: filteredServices,
      inventory_items: filteredInventory,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});