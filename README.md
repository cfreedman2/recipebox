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

## Optional cloud sync

Recipes save in the browser by default. To sync via Supabase:
`npm run install:cloud`, then set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` in `.env`.
