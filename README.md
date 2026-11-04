# Menu Passport

Restaurant menus translated by Meta AI while keeping the original PDF artwork and layout. Built for the Meta Global AI Developer Hackathon (November 2026).

## What works

- Restaurant workspace, using Sites' ChatGPT sign-in; every menu is owned by its creator.
- Upload a text-based PDF (8 MB / 20 pages maximum), preserve its original file in R2, extract positioned text in the browser, and save the layout in D1.
- Translate into 30 selectable languages using **Meta Muse Spark 1.3** through `https://api.meta.ai/v1/responses`.
- Render original PDF artwork with text drawing suppressed, then draw translated text into the original text regions. Hebrew/Arabic use browser RTL text shaping.
- Original/translated view, readable text view, original text corrections, reviewed publication/unpublication and downloadable QR codes.
- Cache translations per menu revision and language. Numbers must match the source. Numeric-only blocks are never sent for translation.
- Draft PDF and metadata require the owner. Published menu routes are anonymous-compatible. The hosting platform's audience setting must also permit public access before guests can open links without sign-in.

## Current limits (prototype)

This is layout-preserving translation for **text PDFs**, not OCR or image inpainting. Scanned pages with no extractable text are rejected; writing embedded in photographs is unchanged. Embedded brand typography is approximated with serif/sans-serif replacement fonts. Long translations shrink to fit; small text is flagged and text view is available. Complex clipping, decorative fonts, mixed-direction and rotated layouts need per-document review. Translation quality is not guaranteed in all 30 languages.

The demo menu is fictional; its English demo translation is hand-authored and explicitly labeled. Uploaded menus use Meta. No dietary or allergen claims are generated.

## Run locally

Node >=22.13 is required.

```sh
npm ci
cp .env.example .dev.vars
# Set MODEL_API_KEY in .dev.vars, without committing it.
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_clear_archangel.sql
npm run dev -- --port 5178
```

Apply each migration only once. Local development simulates login via `/signin-with-chatgpt?return_to=/` as `local_seedy`. Production uses real platform authentication; mock login is not bundled. Local and hosted databases are separate.

## Deploy / GitHub

The source is ready for a public GitHub repository. Never upload `.dev.vars`, `.env`, `.wrangler`, or restaurant PDFs from local runtime storage. `public/demo-menu.pdf` is a generated fictional fixture safe to share. PDF.js is Apache-2.0 licensed; its vendored worker license is retained in the file header.

Hosting uses Sites / Cloudflare Workers + D1 + R2, with configuration in `.openai/hosting.json`. Configure `MODEL_API_KEY` as a production secret separately; local secrets are intentionally not uploaded. Start with a private preview, then enable public audience before sharing QR codes with restaurant guests. Publishing a menu inside the app does not change the platform's audience.

## Security and costs

Owner checks cover all menu writes, revisions use optimistic concurrency, and mutations require the same Origin. Published guests may request only the finite language list; translations have per-language leases and a global atomic 5-starts/minute limit. These are prototype abuse controls, not a monthly spending cap. Use provider billing controls before a public launch. PDFs are stored server-side and rendered client-side; Meta receives extracted text, not the original PDF in this implementation. Incoming PDFs/layouts are size-limited and validated.

## Verification

`npx tsc --noEmit` and `npm run build`. Browser checks cover demo original/English rendering, local login, PDF upload, actual Meta Hebrew translation, review/publication, QR generation and mobile layout. Real restaurant PDFs remain to be validated with the user.
