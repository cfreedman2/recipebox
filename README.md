# Recipe Box

A printable digital recipe box that mirrors high-end cookbooks. Paste recipe
text or upload photos (handwritten cards, cookbook pages, magazine clippings)
and AI turns them into clean, beautifully typeset A4 recipe cards.

This app is the merge of two prototypes, keeping the strongest parts of each:

- **Extraction engine (from the Gemini "Heirloom" app):** single-call Gemini
  structured-output parsing with a three-phase culinary-logic prompt
  (transcription → reconciliation → restrained direction), handwritten vs.
  professional document classification, multi-recipe detection, and food-photo
  bounding-box detection. Model fallback + retry with exponential backoff.
- **Design & frontend (from the Claude/Cursor "Lean" app):** Figma-derived
  design system (Manrope type styles + design tokens synced via the Figma MCP),
  componentized A4 recipe card with pagination, metric/imperial unit toggle,
  custom categories, print-ready layout, and localStorage persistence with
  optional Supabase cloud sync.

## Run locally

1. `npm install`
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`
   (get one at https://aistudio.google.com/apikey)
3. `npm run dev` — starts the web app (http://localhost:5173) and the API together

Pasted text still works without an API key via the built-in local parser;
photo reading requires the key.

## How photo parsing works

1. Each uploaded image goes to Gemini with the recipe extraction prompt
   (`server/recipeExtractionPrompt.js` — edit it to tune extraction behavior).
2. Gemini returns structured recipes (title, ingredients as
   quantity/unit/name, steps, notes, servings, category) plus a
   `foodBoundingBox` when the page contains a photo of the finished dish.
3. The food region is cropped client-side on a canvas to the card's 3:1
   banner — the photo stays authentic; no generative image editing.
4. Images with no recipe text are treated as standalone dish photos and
   matched to the extracted recipes.

## Production

`npm run build` then `npm start` — Express serves the built frontend and the
API on one port (default 3001).

## Two modes

- **Local mode (default):** no accounts, recipes save in this browser.
  Perfect for personal use and development.
- **Cloud mode:** user accounts with secure sign-in, per-user recipe storage,
  a 30-recipe free plan, and a yearly paid plan via Stripe.

## Cloud mode setup

### 1. Accounts & storage (Supabase)

Passwords are never stored by this app — Supabase Auth manages them
(industry-standard bcrypt hashing, reset emails, sessions).

1. Create a free project at https://supabase.com
2. In the SQL Editor, paste and run `supabase/schema.sql`. This creates the
   per-user `recipes` and `profiles` tables with row-level security (each
   user can only access their own data) and enforces the 30-recipe free
   limit inside the database, where it can't be bypassed.
3. In `.env`, set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API).

With these set, the app shows a sign-in screen, recipes follow the user
across devices, and the AI parsing API requires a signed-in user (so
strangers can't spend your Gemini credits).

### 2. Payments (Stripe)

Card numbers never touch this app — checkout happens on Stripe's hosted,
PCI-compliant page. Your server only learns "this user's subscription is
active."

1. At https://dashboard.stripe.com create a Product with a **yearly**
   recurring price; copy the `price_...` id.
2. Add a webhook endpoint pointing at
   `https://your-app-url/api/billing/webhook` with events
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`; copy the `whsec_...` secret.
3. In `.env`, set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`,
   `STRIPE_WEBHOOK_SECRET`, and `APP_URL`.

Flow: free users hit the 30-recipe limit → Upgrade modal → Stripe Checkout
(yearly) → Stripe webhook marks the profile `yearly` with its renewal date →
the database trigger allows unlimited recipes while the subscription is
active. Use `sk_test_...` keys and Stripe's test cards (4242 4242 4242 4242)
to try the whole flow without real money; the Stripe CLI
(`stripe listen --forward-to localhost:3001/api/billing/webhook`) delivers
webhooks to your machine during development.
