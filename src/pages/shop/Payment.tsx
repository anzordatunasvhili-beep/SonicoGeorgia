import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Container } from '@/components/layout/Layout';
import { Card, ErrorState } from '@/components/ui/Display';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Loader, PageLoader } from '@/components/brand/Loader';
import { useQuery } from '@/lib/useQuery';
import { supabase, unwrap } from '@/lib/supabase';
import { createCheckoutToken, loadFlitt, mountFlitt } from '@/lib/flitt';
import { money } from '@/lib/format';
import type { Order } from '@/lib/types';

/** Step 2: Flitt embedded (seamless) checkout for an existing order. */
export default function Payment() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const order = useQuery(async () => unwrap(await supabase.from('orders').select('*, order_items(*)').eq('id', orderId).maybeSingle()) as Order | null, [orderId]);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);

  const payable = order.data && ['pending_payment', 'payment_failed'].includes(order.data.status);

  const start = async () => {
    if (!order.data) return;
    setState('loading');
    setError(null);
    try {
      const [token] = await Promise.all([createCheckoutToken(order.data.id), loadFlitt()]);
      const container = document.getElementById('flitt-checkout');
      if (container) container.innerHTML = '';
      mountFlitt('#flitt-checkout', token, () => navigate(`/account/orders/${order.data!.id}?payment=return`, { replace: true }));
      setState('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState('error');
    }
  };

  useEffect(() => {
    if (payable && !mounted.current) {
      mounted.current = true;
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payable]);

  if (order.loading) return <PageLoader />;
  if (order.error) return <Container className="py-16"><ErrorState message={order.error} onRetry={order.reload} /></Container>;
  if (!order.data) return <Container className="py-16"><ErrorState message="Order not found." /></Container>;

  if (!payable) {
    return (
      <Container className="py-16">
        <Card className="mx-auto max-w-lg p-8 text-center">
          <Icon name="task_alt" size={48} className="text-emerald-600" />
          <h1 className="mt-3 font-display text-2xl font-bold">This order is already {order.data.status.replace('_', ' ')}</h1>
          <Button className="mt-6" onClick={() => navigate(`/account/orders/${order.data!.id}`)}>View order</Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <h1 className="font-display text-4xl font-bold">Payment</h1>
      <p className="mt-2 text-ink-500">Order <b className="text-ink">{order.data.order_number}</b> · {money(order.data.total, order.data.currency)}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <Card className="min-h-[420px] p-4 sm:p-6">
          {state === 'loading' && <div className="flex h-80 items-center justify-center"><Loader label="Preparing secure payment" /></div>}
          {state === 'error' && (
            <div className="space-y-4 p-4">
              <ErrorState message={error ?? 'Payment could not be started'} onRetry={start} />
            </div>
          )}
          <div id="flitt-checkout" className={state === 'ready' ? '' : 'hidden'} />
        </Card>
        <Card className="h-fit p-6">
          <h2 className="font-display text-lg font-bold">Order {order.data.order_number}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {order.data.order_items?.map((i) => (
              <li key={i.id} className="flex justify-between gap-3"><span className="truncate">{i.product_name} × {i.quantity}</span><span>{money(i.line_total)}</span></li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-ink/5 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-500">Shipping</dt><dd>{Number(order.data.shipping_cost) === 0 ? 'Free' : money(order.data.shipping_cost)}</dd></div>
            <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{money(order.data.total, order.data.currency)}</dd></div>
          </dl>
          <p className="mt-5 flex items-start gap-2 rounded-2xl bg-paper-100 p-3 text-xs text-ink-500">
            <Icon name="shield_lock" size={18} className="text-moss" />
            Card details are entered in Flitt’s secure form and never touch Sonico’s servers. Your order is confirmed once Flitt notifies us of the payment.
          </p>
          <Link to={`/account/orders/${order.data.id}`} className="mt-4 block text-center text-sm font-semibold text-ink-500 hover:text-ink">Pay later — view order</Link>
        </Card>
      </div>
    </Container>
  );
}
