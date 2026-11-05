import { supabase } from './supabase';

const JS = 'https://pay.flitt.com/latest/checkout-vue/checkout.js';
const CSS = 'https://pay.flitt.com/latest/checkout-vue/checkout.css';

interface FlittInstance {
  $on?: (event: string, cb: (model: unknown) => void) => void;
}
declare global {
  interface Window {
    checkout?: (selector: string, options: Record<string, unknown>) => FlittInstance;
  }
}

let loading: Promise<void> | null = null;

/** Loads Flitt's embedded checkout bundle once, on demand (only on the payment step). */
export function loadFlitt(): Promise<void> {
  if (window.checkout) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error('Could not load the payment form. Check your connection and try again.'));
    };
    document.body.appendChild(script);
  });
  return loading;
}

/** Ask our edge function (which holds the secret key) for a signed Flitt checkout token. */
export async function createCheckoutToken(orderId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ token?: string; error?: string }>('flitt-checkout', {
    body: { orderId },
  });
  if (error) {
    // FunctionsHttpError carries the JSON body in context
    let message = error.message;
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error) message = body.error;
    } catch { /* keep default */ }
    throw new Error(message);
  }
  if (!data?.token) throw new Error(data?.error ?? 'Payment provider did not return a token');
  return data.token;
}

export function mountFlitt(selector: string, token: string, onSuccess: () => void) {
  if (!window.checkout) throw new Error('Payment form is not loaded');
  const instance = window.checkout(selector, {
    options: {
      methods: ['card', 'wallets'],
      methods_disabled: [],
      card_icons: ['mastercard', 'visa', 'maestro'],
      active_tab: 'card',
      fields: false,
      title: 'Sonico',
      full_screen: false,
      button: true,
      email: false,
      theme: { type: 'light', preset: 'black' },
    },
    params: { token },
  });
  instance?.$on?.('success', () => onSuccess());
  return instance;
}
