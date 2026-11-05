import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FREE_SHIPPING_THRESHOLD, useCart } from '@/context/CartContext';
import { Icon } from '@/components/ui/Icon';
import { Button, IconButton } from '@/components/ui/Button';
import { ProductMedia } from '@/components/product/ProductMedia';
import { QuantityStepper } from '@/components/product/QuantityStepper';
import { money } from '@/lib/format';

export function CartDrawer() {
  const { open, setOpen, rows, subtotal, update, remove, count } = useCart();
  const navigate = useNavigate();
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[75] bg-ink/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.aside
            role="dialog" aria-label="Shopping cart"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="absolute right-0 top-0 flex h-full w-[min(100vw,420px)] flex-col bg-paper-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink/5 px-5 py-4">
              <h2 className="font-display text-lg font-bold">Your bag <span className="text-ink-400">({count})</span></h2>
              <IconButton icon="close" label="Close cart" onClick={() => setOpen(false)} />
            </div>

            {rows.length > 0 && (
              <div className="px-5 pt-4">
                <div className="rounded-2xl bg-white p-3 text-xs text-ink-500 shadow-soft">
                  {remaining > 0 ? <>Add <b className="text-ink">{money(remaining)}</b> more for free shipping</> : <span className="font-semibold text-emerald-700">You unlocked free shipping</span>}
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/5">
                    <div className="h-full rounded-full bg-ember transition-all" style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%` }} />
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {rows.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Icon name="shopping_bag" size={44} className="text-ink-300" />
                  <p className="mt-3 font-medium">Your bag is empty</p>
                  <Button variant="dark" className="mt-5" onClick={() => { setOpen(false); navigate('/shop'); }}>Explore products</Button>
                </div>
              ) : rows.map(({ product, quantity }) => (
                <div key={product.id} className="flex gap-3 rounded-2xl bg-white p-3 shadow-soft">
                  <Link to={`/product/${product.slug}`} onClick={() => setOpen(false)} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                    <ProductMedia product={product} iconSize={30} />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/product/${product.slug}`} onClick={() => setOpen(false)} className="truncate text-sm font-semibold hover:text-ember">{product.name}</Link>
                      <button onClick={() => remove(product.id)} className="text-ink-400 hover:text-red-600" aria-label={`Remove ${product.name}`}>
                        <Icon name="delete" size={18} />
                      </button>
                    </div>
                    <span className="text-xs text-ink-400">{product.stock < quantity ? `Only ${product.stock} in stock` : product.sku}</span>
                    <div className="mt-auto flex items-center justify-between">
                      <QuantityStepper value={quantity} max={Math.min(20, product.stock)} onChange={(v) => update(product.id, v)} small />
                      <span className="text-sm font-bold">{money(product.price * quantity, product.currency)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {rows.length > 0 && (
              <div className="space-y-3 border-t border-ink/5 bg-white px-5 py-4">
                <div className="flex justify-between text-sm"><span className="text-ink-500">Subtotal</span><span className="font-bold">{money(subtotal)}</span></div>
                <p className="text-xs text-ink-400">Shipping and final total are confirmed at checkout.</p>
                <Button className="w-full" size="lg" iconRight="arrow_forward" onClick={() => { setOpen(false); navigate('/checkout'); }}>Checkout</Button>
                <Button variant="ghost" className="w-full" onClick={() => { setOpen(false); navigate('/cart'); }}>View bag</Button>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
