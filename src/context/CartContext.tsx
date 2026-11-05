import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/lib/types';

/** The cart stores only ids + quantities locally; prices are always re-read from the database. */
interface CartLine { productId: string; quantity: number }
export interface CartRow { product: Product; quantity: number }

interface CartState {
  lines: CartLine[];
  rows: CartRow[];
  count: number;
  subtotal: number;
  loading: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (productId: string, qty?: number) => void;
  update: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const KEY = 'sonico.cart.v1';
const MAX_QTY = 20;
const CartContext = createContext<CartState | null>(null);

function readStored(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((l) => typeof l?.productId === 'string' && Number.isInteger(l?.quantity) && l.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readStored);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* storage unavailable */ }
  }, [lines]);

  const ids = lines.map((l) => l.productId).sort().join(',');
  useEffect(() => {
    if (!ids) { setProducts({}); return; }
    let active = true;
    setLoading(true);
    supabase
      .from('products')
      .select('*')
      .in('id', ids.split(','))
      .then(({ data }) => {
        if (!active) return;
        const map: Record<string, Product> = {};
        (data as Product[] | null)?.forEach((p) => (map[p.id] = p));
        setProducts(map);
        setLoading(false);
        // Drop products that disappeared or were deactivated.
        setLines((prev) => prev.filter((l) => map[l.productId]?.is_active));
      });
    return () => { active = false; };
  }, [ids]);

  const add = useCallback((productId: string, qty = 1) => {
    setLines((prev) => {
      const found = prev.find((l) => l.productId === productId);
      if (found) return prev.map((l) => l.productId === productId ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + qty) } : l);
      return [...prev, { productId, quantity: Math.min(MAX_QTY, qty) }];
    });
    setOpen(true);
  }, []);
  const update = useCallback((productId: string, qty: number) => {
    setLines((prev) => qty <= 0
      ? prev.filter((l) => l.productId !== productId)
      : prev.map((l) => l.productId === productId ? { ...l, quantity: Math.min(MAX_QTY, qty) } : l));
  }, []);
  const remove = useCallback((productId: string) => setLines((prev) => prev.filter((l) => l.productId !== productId)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartState>(() => {
    const rows = lines.filter((l) => products[l.productId]).map((l) => ({ product: products[l.productId], quantity: l.quantity }));
    return {
      lines, rows, loading, open, setOpen, add, update, remove, clear,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      subtotal: rows.reduce((s, r) => s + Number(r.product.price) * r.quantity, 0),
    };
  }, [lines, products, loading, open, add, update, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}

export const FREE_SHIPPING_THRESHOLD = 150; // keep in sync with create_order()
export const SHIPPING_FEE = 10;
