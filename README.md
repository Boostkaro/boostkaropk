# BoostKaro — SMM Panel

Static SMM panel website (HTML/CSS/JS) + Supabase (free database). Deploy free on Vercel.

## What's included

- `index.html` — customer storefront: platform tabs → service types → quality tiers, order form (JazzCash/Easypaisa/NayaPay), order tracking
- `admin.html` — private admin panel: view all orders, update status, search/filter (password: `Boostkaro4855`)
- `app.js`, `admin.js`, `styles.css` — logic & styling
- `supabase-schema.sql` — database tables + security policies (already applied)
- `seed-services.sql` — starter services with placeholder prices (run in Supabase SQL Editor)
- `vercel.json` — Vercel static config

## Deploy (free)

1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com) → sign up free → **Add New → Project** → import the repo → **Deploy**. Done — you get a public URL like `boostkaro.vercel.app`.

## Supabase setup (already done, for reference)

- Project: `https://jixdvkssgqitqjucjiob.supabase.co`
- Tables `services` and `orders` created with Row Level Security:
  - public can read active services
  - public can insert orders
  - public can look up orders (tracking uses order code + contact number)

## Enabling admin status updates (optional)

Right now the admin panel can **view** all orders, but changing an order's status from the panel may be blocked by database permissions. To allow it, run this in the Supabase SQL Editor:

```sql
create policy "admin update orders" on orders
  for update using (true) with check (true);
```

> ⚠️ **Warning:** this policy lets *anyone with the anon key* update any order. It works for a small private operation, but for stronger security later, switch the admin panel to Supabase Auth (proper admin login) instead of the built-in password gate.

## Changing prices

Edit prices any time in Supabase: **Table Editor → services** → change `price_usd`. The site reads live prices on every load.

## Payment details shown on site

- JazzCash / Easypaisa: **0334 8139464** (Muhammad Siraj)
- WhatsApp support: `https://wa.me/923348139464`
