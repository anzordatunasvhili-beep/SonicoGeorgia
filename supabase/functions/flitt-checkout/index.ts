// Creates a Flitt checkout token for an order owned by the calling user.
// The browser renders Flitt's embedded (seamless) checkout with this token.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';
import { corsHeaders, json } from '../_shared/cors.ts';
import { FLITT_API, flittSignature, toMinor } from '../_shared/flitt.ts';

const MERCHANT_ID = Deno.env.get('FLITT_MERCHANT_ID') ?? '';
const SECRET = Deno.env.get('FLITT_SECRET_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!MERCHANT_ID || !SECRET) return json({ error: 'Payments are not configured' }, 500);

  // Identify the caller from their JWT.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  let orderId: string | undefined;
  try {
    ({ orderId } = await req.json());
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }
  if (!orderId) return json({ error: 'orderId is required' }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: order, error } = await admin
    .from('orders')
    .select('id, order_number, user_id, status, total, currency, contact_email')
    .eq('id', orderId)
    .single();
  if (error || !order) return json({ error: 'Order not found' }, 404);
  if (order.user_id !== user.id) return json({ error: 'Forbidden' }, 403);
  if (!['pending_payment', 'payment_failed'].includes(order.status)) {
    return json({ error: 'This order is not awaiting payment' }, 409);
  }

  // Every attempt gets a unique Flitt order_id; the latest one is stored on the order.
  const reference = `${order.order_number}-${Date.now().toString(36)}`;
  const request: Record<string, string | number> = {
    merchant_id: Number(MERCHANT_ID),
    order_id: reference,
    order_desc: `Sonico order ${order.order_number}`,
    amount: toMinor(order.total),
    currency: order.currency,
    sender_email: order.contact_email,
    server_callback_url: `${SUPABASE_URL}/functions/v1/flitt-callback`,
    lifetime: 3600,
  };
  request.signature = await flittSignature(SECRET, request);

  const res = await fetch(`${FLITT_API}/checkout/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ request }),
  });
  const body = await res.json().catch(() => null);
  const token = body?.response?.token;
  if (!res.ok || body?.response?.response_status !== 'success' || !token) {
    console.error('Flitt token error', body);
    return json({ error: body?.response?.error_message ?? 'Payment provider error' }, 502);
  }

  await admin
    .from('orders')
    .update({ payment_reference: reference, status: 'pending_payment' })
    .eq('id', order.id);

  return json({ token, reference });
});
