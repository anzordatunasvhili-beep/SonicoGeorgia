# Sonico — e-commerce for sound

React + Vite + TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage, Edge Functions) · React Three Fiber · Flitt payments · Google Material Symbols.

## 1. Set up the project

```bash
npm install
cp .env.example .env    # set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

> Behind a corporate TLS proxy, npm can fail with `SELF_SIGNED_CERT_IN_CHAIN`. Run npm with Node's system certificate store: `NODE_OPTIONS=--use-system-ca npm install`.

## 2. Set up the database

1. Create a Supabase project.
2. In the SQL editor, run `supabase/migrations/20261105000001_schema.sql`, then `supabase/seed.sql` (8 categories and 20 products). With the CLI, run `supabase db push` and then run the seed.
3. Sign up in the app. Then make yourself an admin:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
4. In Auth → URL configuration, add your site URL and `/reset-password` to the redirect URLs.

## 3. Set up payments (Flitt embedded checkout)

```bash
supabase secrets set FLITT_MERCHANT_ID=1549901 FLITT_SECRET_KEY=test SITE_URL=http://localhost:5173
supabase functions deploy flitt-checkout
supabase functions deploy flitt-callback --no-verify-jwt
```

`1549901` and `test` are Flitt's public **test** credentials. Test card: `4444 5555 6666 1111`, any future expiry date and any CVV. Use your live credentials in production.

How a payment works:
1. `create_order()` (an RPC) re-reads prices and stock in the database, records which creator designed each item and which royalty agreement applies, and creates a `pending_payment` order. Prices sent by the browser are never trusted.
2. The `flitt-checkout` function checks that the order belongs to the caller. It signs the request (SHA-1 over the sorted parameters, prefixed with the secret) and returns a checkout token. The browser then loads Flitt's embedded form.
3. Flitt calls `flitt-callback`. The function checks the signature, merchant ID, amount and currency. It logs every callback to `payment_transactions`. When the payment is approved, it calls `mark_order_paid()`, which:
   - marks the order paid, and does nothing if it already is (safe to repeat)
   - reduces stock and writes inventory movements
   - creates the creator earnings

Amounts are sent to Flitt in minor units (tetri/cents).

## Security model

- Row Level Security is enabled on every table. The route guards in the UI are only for convenience; the database enforces access.
- Users can't change their own role. Creators can edit only drafts and designs sent back for changes, and can't touch any review fields. Customers can't update orders.
- `mark_order_paid` can only be executed by the service role.
- Creator payout details live in `creators.payout_notes`, which only the creator and admins can read. Visitors read the `creator_profiles` view instead.
- Storage buckets:
  - `product-media`: public read, only admins can write.
  - `avatars`: each user writes only their own folder.
  - `creator-submissions`: private. Files are stored under `<uid>/<submission>/…` and viewed through signed URLs.

## Creator program flow

1. Apply → admin approves (`review_creator_application`). This creates the creator record and grants the `creator` role.
2. Creator submits a design with images and an optional .glb model → admin reviews it: in review, changes requested, approved or rejected.
3. Admin creates a hidden product draft from the design and proposes a royalty agreement → creator accepts it in the studio (`respond_to_agreement`).
4. Paid orders of that product create `creator_earnings` at the rate recorded on the order item.
5. After delivery + 30 days, admin marks earnings **payable**, then records a manual payout (`admin_record_payout`). **No automatic payouts.**
6. Cancelling or refunding an order voids any unpaid earnings and restocks the items.

## 3D models

The product page lazy-loads `ProductViewer3D`, which contains three.js (about 276 KB gzipped). That code downloads only when someone opens a product. The viewer supports:
- rotate (drag), zoom (scroll and buttons), auto-rotate, reset
- an **assembly animation**: the parts fly in when the viewer opens, and the explode toggle separates and reassembles them

Upload a `.glb` file in Admin → Products to use a real model. Until then, a procedural model is shown, chosen by `model_preset` (headphones, speaker, turntable, keyboard, earbuds, radio, generic). Large models load faster if compressed first (e.g. `gltf-transform optimize`).

## Product images

The seed has no photos. Products show a branded tile (accent colour + type icon) until you upload images in Admin → Products.

## Known limitations / next steps

- Stock is checked when an order is created but only reserved when payment succeeds. Two buyers paying for the last unit at the same time could oversell; add a reservation step with an expiry if that matters.
- Refunds must be issued in the Flitt merchant portal. Admin → "Mark refunded" only updates Sonico's records.
- No transactional emails yet (order confirmation, shipping). Add them with a Supabase Edge Function plus an email provider, or a database webhook.
- The policy pages (privacy, terms, shipping, returns) are templates. Have them reviewed by a lawyer before launch.
