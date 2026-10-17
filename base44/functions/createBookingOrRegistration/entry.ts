import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { type, business_id, customer_name, customer_email, customer_phone, service_id, service_name, start_at, end_at, party_size, notes, programme_name, season, participant_name, participant_age } = body;

    if (!business_id) {
      return Response.json({ error: 'business_id is required' }, { status: 400 });
    }

    // Find or create a customer record
    let customer = null;
    if (customer_email) {
      const existing = await base44.asServiceRole.entities.Customer.filter({ business_id, email: customer_email });
      if (existing.length > 0) {
        customer = existing[0];
      }
    }
    if (!customer && (customer_name || customer_email || customer_phone)) {
      customer = await base44.asServiceRole.entities.Customer.create({
        business_id,
        full_name: customer_name || customer_email || 'Guest',
        email: customer_email || null,
        phone: customer_phone || null,
      });
    }

    if (type === 'registration') {
      const registration = await base44.asServiceRole.entities.Registration.create({
        business_id,
        customer_id: customer?.id || null,
        programme_name: programme_name || service_name || 'Unknown Programme',
        season: season || null,
        participant_name: participant_name || customer_name || 'Unknown',
        participant_age: participant_age || null,
        status: 'pending',
        payment_status: 'unpaid',
        notes: notes || null,
      });
      return Response.json({ success: true, type: 'registration', id: registration.id, record: registration });
    } else {
      const booking = await base44.asServiceRole.entities.Booking.create({
        business_id,
        customer_id: customer?.id || null,
        booking_type: body.booking_type || 'appointment',
        start_at: start_at || null,
        end_at: end_at || null,
        party_size: party_size || null,
        notes: notes || null,
        status: 'pending',
      });
      return Response.json({ success: true, type: 'booking', id: booking.id, record: booking });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});