import { Link } from 'react-router-dom';
import { Container } from '@/components/layout/Layout';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, useCart } from '@/context/CartContext';
import { ProductMedia } from '@/components/product/ProductMedia';
import { QuantityStepper } from '@/components/product/QuantityStepper';
import { ButtonLink } from '@/components/ui/Button';
import { Card, EmptyState } from '@/components/ui/Display';
import { Icon } from '@/components/ui/Icon';
import { PageLoader } from '@/components/brand/Loader';
import { money } from '@/lib/format';

export default function Cart() {
  const { rows, subtotal, update, remove, loading, lines } = useCart();
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE;

  if (loading && rows.length === 0 && lines.length > 0) return <PageLoader />;

  return (
    <Container className="py-10">
      <h1 className="font-display text-4xl font-bold">Your bag</h1>
      {rows.length === 0 ? (
        <div className="mt-8"><EmptyState icon="shopping_bag" title="Your bag is empty" text="Find something that sounds like you." action={<ButtonLink to="/shop">Shop products</ButtonLink>} /></div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {rows.map(({ product, quantity }) => (
              <Card key={product.id} className="flex gap-4 p-4">
                <Link to={`/product/${product.slug}`} className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl"><ProductMedia product={product} iconSize={40} /></Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    <div>
                      <Link to={`/product/${product.slug}`} className="font-semibold hover:text-ember">{product.name}</Link>
                      <p className="text-sm text-ink-500">{money(product.price, product.currency)}</p>
                    </div>
                    <button onClick={() => remove(product.id)} className="h-fit text-ink-400 hover:text-red-600" aria-label={`Remove ${product.name}`}><Icon name="delete" /></button>
                  </div>
                  {product.stock < quantity && <p className="mt-1 text-xs text-red-600">Only {product.stock} available — reduce the quantity to continue.</p>}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <QuantityStepper value={quantity} max={Math.min(20, product.stock)} onChange={(v) => update(product.id, v)} small />
                    <span className="font-bold">{money(product.price * quantity, product.currency)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <OrderSummary subtotal={subtotal} shipping={shipping}>
            <ButtonLink to="/checkout" size="lg" iconRight="arrow_forward" className="w-full">Checkout</ButtonLink>
          </OrderSummary>
        </div>
      )}
    </Container>
  );
}

export function OrderSummary({ subtotal, shipping, children }: { subtotal: number; shipping: number; children?: React.ReactNode }) {
  return (
    <Card className="h-fit p-6 lg:sticky lg:top-28">
      <h2 className="font-display text-lg font-bold">Summary</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-ink-500">Subtotal</dt><dd>{money(subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-500">Shipping</dt><dd>{shipping === 0 ? 'Free' : money(shipping)}</dd></div>
        <div className="flex justify-between border-t border-ink/5 pt-3 text-base font-bold"><dt>Total</dt><dd>{money(subtotal + shipping)}</dd></div>
      </dl>
      <p className="mt-2 text-xs text-ink-400">Prices are confirmed by our server when you place the order.</p>
      <div className="mt-5 space-y-2">{children}</div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-400"><Icon name="lock" size={14} />Secure payment by Flitt</p>
    </Card>
  );
}
