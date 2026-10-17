import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { business_id } = await req.json();

    if (!business_id) {
      return Response.json({ error: 'business_id is required' }, { status: 400 });
    }

    // Fetch programmes, classes, and packages
    const items = await base44.asServiceRole.entities.ProductService.filter(
      { business_id, is_active: true },
      'name',
      100
    );

    const registrable = items
      .filter(i => ['class', 'programme', 'package'].includes(i.type))
      .map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        description: i.description || null,
        category: i.category || null,
        price: i.price || null,
        currency: i.currency || 'USD',
        duration_minutes: i.duration_minutes || null,
      }));

    // Also fetch recent registrations count to show availability context
    const recentRegs = await base44.asServiceRole.entities.Registration.filter(
      { business_id, status: 'confirmed' },
      '-created_date',
      5
    );

    return Response.json({
      programmes: registrable,
      recent_registrations_count: recentRegs.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});