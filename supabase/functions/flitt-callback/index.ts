// Flitt server_callback_url handler. Deploy with --no-verify-jwt.
// Verifies the signature, logs every callback, and marks the order paid (idempotent).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';
import { toMinor, verifyFlittSignature } from '../_shared/flitt.ts';

const SECRET = Deno.env.get('FLITT_SECRET_KEY') ?? '';
const MERCHANT_ID = Deno.env.get('FLITT_MERCHANT_ID') ?? '';
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function readPayload(req: Request): Promise<Record<string, unknown>> {
  const type = req.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const body = await req.json();
    return (body?.response ?? body) as Record<string, unknown>;
  }
  const form = await req.formData();
  return Object.fromEntries(Array.from(form.entries()).map(([k, v]) => [k, String(v)]));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let payload: Record<string, unknown>;
  try {
    payload = await readPayload(req);
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const signatureOk = !!SECRET && (await verifyFlittSignature(SECRET, payload));
  const reference = String(payload.order_id ?? '');
  const flittStatus = String(payload.order_status ?? '');
  const amountMinor = Number(payload.amount ?? NaN);

  const { data: order } = await admin
    .from('orders')
    .select('id, total, currency, status')
    .eq('payment_reference', reference)
    .maybeSingle();

  await admin.from('payment_transactions').insert({
    order_id: order?.id ?? null,
    reference,
    order_status: flittStatus,
    amount_minor: Number.isFinite(amountMinor) ? amountMinor : null,
    currency: payload.currency ? String(payload.currency) : null,
    signature_ok: signatureOk,
    payload,
  });

  if (!signatureOk || String(payload.merchant_id ?? '') !== String(MERCHANT_ID)) {
    console.warn('Rejected Flitt callback', { reference, signatureOk });
    return new Response('Invalid signature', { status: 400 });
  }
  if (!order) return new Response('OK', { status: 200 }); // unknown reference: acknowledge

  if (flittStatus === 'approved') {
    const matches = amountMinor === toMinor(order.total) && String(payload.currency) === order.currency;
    if (!matches) {
      console.error('Amount mismatch — order left unpaid for manual review', { reference, amountMinor, total: order.total });
      return new Response('OK', { status: 200 });
    }
    const { error } = await admin.rpc('mark_order_paid', {
      p_order: order.id,
      p_payment_id: String(payload.payment_id ?? ''),
    });
    if (error) {
      console.error('mark_order_paid failed', error);
      return new Response('Retry', { status: 500 }); // Flitt retries non-200 responses
    }
  } else if (['declined', 'expired', 'reversed'].includes(flittStatus) && order.status === 'pending_payment') {
    await admin.from('orders').update({ status: 'payment_failed' }).eq('id', order.id);
  }

  return new Response('OK', { status: 200 });
});
