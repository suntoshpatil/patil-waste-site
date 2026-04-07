# Patil Waste Removal LLC — Project Handoff for Claude Code

## Project Overview
Full-stack Next.js 14 web app for a residential trash pickup service in Bedford/Merrimack/Amherst/Milford NH. Includes a public marketing site, customer self-service portal, and admin management panel.

## Stack
- **Framework**: Next.js 14 (App Router, TypeScript, Tailwind v4)
- **Database**: Supabase (Postgres + PostgREST)
- **Payments**: Stripe (currently test mode — switch to live before launch)
- **Email**: Resend (currently placeholder key — set up after domain transfer)
- **Deploy**: Vercel Pro at `patil-waste-site.vercel.app`
- **Repo**: `github.com/suntoshpatil/patil-waste-site` (main branch)

## Owner Info
- **Name**: Suntosh Patil
- **Phone**: (802) 416-9484
- **Email**: patilwasteremoval@gmail.com
- **Address**: 80 Palomino Ln, Bedford NH 03110

## Environment Variables (set in Vercel)
```
ADMIN_PASSWORD          — admin panel login password
CRON_SECRET             — pw9X#mK2$vL8nQ4j
STRIPE_SECRET_KEY       — Stripe secret (test mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — Stripe publishable (test mode)
NEXT_PUBLIC_SITE_URL    — https://patil-waste-site.vercel.app
SUPABASE_URL            — https://kmvwwxlwzacxvtlqugws.supabase.co
SUPABASE_ANON_KEY       — (anon key in Vercel)
RESEND_API_KEY          — re_placeholder (update after domain transfer)
```

## Deployment
- GitHub push to `main` → Vercel auto-deploys (Pro plan, unlimited deployments)
- Deploy hook (backup): `https://api.vercel.com/v1/integrations/deploy/prj_fTRGhb6NGX3qmrvxU8oBqC4GBmPq/UAoovvJs8z`
- Always run `npm run build` before pushing — TypeScript errors will break the deploy

## File Structure
```
src/app/
  (site)/                     ← Public pages (with Nav + Footer)
    page.tsx                  ← Homepage
    services/, recycling/, faqs/, promotions/, contact/
    signup/                   ← New customer signup form
    portal/                   ← Customer self-service portal
    junk-removal/             ← Public junk removal request form
    layout.tsx
  admin/page.tsx              ← Full admin panel (single file, ~1700 lines)
  api/
    admin/auth/route.ts       ← Server-side admin authentication
    admin/run-cron/route.ts   ← Secure cron proxy (requires admin token)
    cron/generate-invoices/route.ts  ← Runs on 25th to generate invoices
    cron/charge-autopay/route.ts     ← Runs on 1st to charge autopay cards
    stripe/setup-intent/route.ts
    stripe/save-card/route.ts
    stripe/checkout-session/route.ts
    stripe/confirm-setup/route.ts
    emails/contract-accepted/route.ts
    emails/signup/route.ts
src/lib/billing.ts            ← calcInvoiceTotal, getBillingPeriod, sbServer
src/lib/emails.ts             ← invoiceEmail template
src/components/Nav.tsx, Footer.tsx, Logo.tsx
public/logo.png
CLAUDE.md                     ← This file
```

## Key Business Rules

### Pricing Plans
| Plan | Monthly | Quarterly |
|------|---------|-----------|
| Curbside Trash | $42/mo | pay 3mo upfront |
| Trash & Recycling | $52/mo | pay 3mo upfront |
| Curbside Trash (Bi-Weekly) | $26/mo | — |
| Trash & Recycling (Bi-Weekly) | $30/mo | — |
| Garage-Side Pickup | +$10/mo | |
| Garage-Side Pickup (Senior 65+) | +$5/mo | |
| Trash Bin Rental | +$7.99/mo ($25 deposit) | |
| Recycling Bin Rental | +$3.99/mo | |

### Subscription Rate Field
- `subscriptions.rate` is ALWAYS the **monthly rate** regardless of billing cycle
- Quarterly invoice amount = `rate × 3`
- Monthly revenue = `rate` (never divide quarterly rate by 3 for revenue display)

### Billing Cycles
**Monthly customers**: Invoice generated on 25th covering next month, due 1st

**Quarterly customers**: Invoice generated on 25th of the last month of their quarter
- Existing Squarespace customers: Mar/Jun/Sep/Dec cycle (Apr–Jun, Jul–Sep, Oct–Dec, Jan–Mar)
- New customers: rolling — invoice every 3 months from their start date
- Logic: check if last paid invoice's `period_end` falls in the current month → generate next quarter

### Cron Jobs
- **Generate invoices**: 25th of every month at 6am ET
- **Charge autopay**: 1st of every month at 7am ET
- Both run via `/api/cron/generate-invoices` and `/api/cron/charge-autopay`
- Admin can manually trigger via `/api/admin/run-cron` (requires admin Bearer token)

### Bi-Weekly Pickups
- `subscriptions.pickup_frequency` = `'weekly'` or `'biweekly'`
- Bi-weekly logic: based on `billing_start` date, every other week from there
- `isBiweeklyPickupWeek(billingStart)`: use `Math.round((today - start) / msPerWeek) % 2 === 0`
- Always use midnight `T00:00:00` and `Math.round` (not `Math.floor`) to avoid timezone bugs

### First Invoice (at contract acceptance)
- Monthly: covers rest of current month, prorated by pickup occurrences
- Quarterly: covers 3 months from billing_start, prorated by pickup occurrences
- Due on receipt (same day)

## Supabase Tables

### customers
`id, first_name, last_name, email, phone, service_address, town, status, payment_method, bin_situation, garage_side_pickup, garage_side_rate, gate_notes, notes, portal_pin, stripe_customer_id, stripe_payment_method_id, auto_pay, contract_accepted, contract_accepted_at`

Status values: `active`, `pending`, `paused`, `cancelled`, `overdue`

### subscriptions
`id, customer_id, service_id, status, billing_cycle, rate, pickup_day, pickup_frequency, billing_start, next_billing_date`

### services
`id, name, type (recurring/one_time/addon), base_price_monthly, is_active`

Current recurring services:
- Curbside Trash ($42)
- Trash & Recycling ($52)
- Curbside Trash (Bi-Weekly) ($26)
- Trash & Recycling (Bi-Weekly) ($30)

### invoices
`id, customer_id, subscription_id, subtotal, adjustments_total, tax_rate, tax_amount, total, status (draft/sent/paid/overdue), period_start, period_end, due_date, paid_at, stripe_invoice_id, notes`

### bins
`id, customer_id, bin_type (trash/recycling), ownership (rental/own), monthly_rental_fee, assigned_date, notes (deposit status)`

### pickup_addons
`id, customer_id, catalog_item_id, custom_description, quantity, estimated_price, final_price, status (pending_quote/confirmed/picked_up/invoiced/cancelled), requested_pickup_date, admin_notes`

Status rules:
- `pending_quote` → customer submitted, needs admin pricing
- `confirmed` → priced, will appear on next invoice
- `picked_up` → done, locked, on next invoice (only admin can remove/edit)
- `invoiced` → billed, archived
- Admin-added no-notice charges have "no notice" in `custom_description` — customers cannot cancel these

### skip_requests
`id, customer_id, subscription_id, skip_date, status (pending/approved/denied), refund_amount`

Limit: 2 per quarter

### schedule_notices
`id, notice_date, affected_date, replacement_date, notice_type (announcement/cancellation/reschedule/info), message`

- `announcement` → show to ALL customers regardless of pickup day
- `cancellation/reschedule/info` → only show to customers whose pickup_day matches the day of week of `notice_date`

### Also: bulky_item_catalog, job_requests, service_requests, payment_logs, customer_history

### bulky_item_catalog columns
`id, name, estimate_min, estimate_max, fixed_price, is_fixed_price, is_active`
(Note: NOT `base_price` — that column doesn't exist)

## Admin Panel (`/admin`)
- Login: password stored in `ADMIN_PASSWORD` env var
- Auth token stored in `localStorage` as `pwradmin` — persists across refreshes
- Auto-refreshes data every 60 seconds
- Single-file component: `src/app/admin/page.tsx`

### Admin Features
- **Dashboard**: stats (active/pending/revenue/overdue), revenue chart, recent signups
- **Customers**: list with billing cycle badges, search/filter, bulk status change
  - Customer detail modal: full info, edit all fields, rate override, garage pickup toggle
  - Buttons: Edit, Delete, Reset PIN, History, Preview Invoice
  - Preview Invoice: shows next invoice breakdown including extra bag charges
  - Extra bags section: add no-notice charges, view/remove pending charges
- **Routes**: grouped by pickup day, bi-weekly customers show ✅/⏭ this week/skip week
- **Invoices**: tabbed — Sent & Paid / Upcoming
  - Upcoming tab: shows next invoice for every active customer with send date, extra bag charges, paid-through status
  - Can edit upcoming invoice amounts (updates subscription rate)
- **Payments**: payment log
- **Requests**: approve/deny service addition requests and skip requests
- **Jobs**: pickup add-ons (with Mark Picked Up / Remove / Edit Price) + public junk removal requests
- **Notices**: post/edit/delete schedule notices

### Import Existing Customer Flow
- Switch to "📋 Import Existing" tab in Add Customer modal
- Sets customer to active immediately, no contract sent
- "Paid through" date field: creates a paid invoice record so cron skips them until that date
- Automatically deletes any conflicting sent/draft invoices within the paid-through period
- Start date field is hidden (not relevant for imports)

## Customer Portal (`/portal`)
- Login: email → PIN (customers set PIN at contract acceptance)
- Forgot PIN: verify last 4 digits of phone
- Rate limiting: 5 failures → 15 min lockout
- Contract screen shown on first login (before portal access)
- Contract acceptance generates first invoice and optionally saves payment card

### Portal Tabs
- **Overview**: plan details, pickup schedule, bin rentals, skip credits, account details (edit email/phone), schedule notices
- **Schedule**: calendar with pickup days highlighted, approved skips (red), notices (amber)
- **Add to Pickup**: bulky item requests (with catalog), extra bag requests; shows pending requests with cancel option
- **Services**: request plan additions/upgrades
- **Skip Pickup**: select actual pickup dates to skip (2/quarter limit)
- **Billing**: current invoice + Pay Now, autopay setup, invoice history + download

## Known Pending Items (pre-launch)
1. **SQL migrations** — run in Supabase if not done:
   ```sql
   ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pickup_frequency text DEFAULT 'weekly';
   UPDATE subscriptions SET pickup_frequency = 'weekly' WHERE pickup_frequency IS NULL;
   ALTER TABLE customers ALTER COLUMN garage_side_rate DROP DEFAULT;
   UPDATE customers SET garage_side_rate = NULL WHERE garage_side_pickup = false OR garage_side_pickup IS NULL;
   ```
2. **Domain transfer**: Squarespace → Vercel (patilwasteremoval.com or similar)
3. **Resend setup**: after domain transfer, update `RESEND_API_KEY` in Vercel
4. **Stripe live keys**: switch `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to live mode
5. **Import remaining customers**: use Import Existing flow with paid-through dates

## Common Gotchas
- `billingStartDate` in portal is a `Date` object — don't call `.getTime()` on string versions
- Always use `Math.round` (not `Math.floor`) for bi-weekly week calculations
- `schedule_notices` RLS: policy is now `FOR ALL USING (true) WITH CHECK (true)` — allows delete
- `bulky_item_catalog` has `estimate_min/estimate_max/fixed_price` — NOT `base_price`
- The `sb()` helper in admin uses the anon key — for heavy operations use `sbServer()` in API routes
- Turbopack (Next.js dev) struggles with complex JSX expressions — keep arrow functions simple or extract to named functions/components
