import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { business_id, type } = await req.json();

    if (!business_id) {
      return Response.json({ error: 'business_id is required' }, { status: 400 });
    }

    const filter = { business_id, is_active: true };
    if (type) filter.type = type;

    const items = await base44.asServiceRole.entities.ProductService.filter(filter, 'name', 50);

    return Response.json({
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        description: i.description || null,
        price: i.price || null,
        currency: i.currency || 'USD',
        duration_minutes: i.duration_minutes || null,
        category: i.category || null,
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});