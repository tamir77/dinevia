# Dinevia

**Menus Without Borders**

Read every dish. Find your favorites. Feel at home at any table.

Local menu. Your language. Your preferences. Your currency.

[Open Dinevia](https://dinevia-1opu.onrender.com) · [Watch the 2:34 demo](https://dinevia-1opu.onrender.com/demo/dinevia-demo.mp4)

The homepage includes an accessible video player with English narration and optional English captions. The film is an edited walkthrough using actual app screens and an owned fictional menu.

## The product

Dinevia turns a restaurant menu link or photograph into a clear text menu. Guests choose from English, German, Spanish, Italian, French, Chinese and Japanese. Dish descriptions and original prices stay together; the original remains available to show a waiter. “For you” adds explained taste suggestions without hiding prices. Approximate currency conversions come from published exchange rates. No guest account is required.

Built for the Meta Global AI Developer Hackathon, inspired by everyday experiences in Moldovan restaurants.

## Built with Meta

Meta Model API is the AI engine serving users. Server-side calls to Muse Spark 1.3 (with a Muse Spark 1.1 compatibility retry only when Meta reports the model unavailable) recognize menu photographs, translate menu text, and reason about ingredient preferences. Application code validates structured responses and numeric details, cleans page content, and caches recognition and translations. Currency arithmetic is deterministic.

Muse Image 1.0 is used by an experimental host image-reconstruction workflow, with Spark reading the output back for validation. This is distinct from the fast guest flow. The public host page currently explains the restaurant vision; self-service restaurant onboarding is not enabled in this demo.

See [the product and Meta explanation](docs/hackathon-submission.md).

## Run locally

Requirements: Node.js 24 or newer and a Meta Model API key with access to the models above.

```sh
npm ci --include=dev --include=optional
```

Create an ignored `.dev.vars` file containing `MODEL_API_KEY=your_key_here`. Never commit this file.

```sh
npm run dev -- --port 5178 --hostname 127.0.0.1
```

Open http://127.0.0.1:5178. The local development environment includes development-only authentication helpers; the public Render server blocks those endpoints.

## Render deployment

Create a Node web service from this repository. Build: `npm ci --include=dev --include=optional && npm run build`. Start: `npm run start:render`. Set `NODE_VERSION=24` and the secret `MODEL_API_KEY` in Render environment settings. Health endpoint: `/healthz`.

This hackathon deployment runs the compiled Workers application using Miniflare, with local SQLite-backed D1 and R2-compatible storage. It is a single-instance prototype. On a free Render instance, uploaded menus and caches are temporary and can be lost on restart or redeployment. Persistent hosting requires a persistent disk or a managed storage migration.

## Checks

```sh
npm test
npx tsc --noEmit
npm run build
```

Tests cover menu cleanup, numeric preservation, currency conversion, language selection, photo handling, preference evidence and interface copy. The demo uses an owned fictional menu processed by the actual application.

## Privacy and limitations

The Meta key stays on the server. Uploaded menu content and supplied preferences are sent to Meta when needed for translation or suggestions. Guest menus use private session access. Do not upload confidential documents.

Google Analytics measures page visits on the public deployment only. Menu contents, preferences, imported URLs, private menu identifiers and query strings are excluded from the pageview payload. Enhanced measurement is disabled, and browser Do Not Track is respected.

OCR and translations may contain mistakes. Taste suggestions are not allergy guarantees. Some restaurant sites block automated access or use menus that cannot be extracted reliably. Photo clarity and PDF page count affect processing time. Exchange rates are approximate, with their source and date shown.

## Technology

React 19, TypeScript, Vinext/Vite, Tailwind CSS, Cloudflare Workers APIs, Drizzle, PDF.js, Meta Model API, and published National Bank of Moldova exchange rates. Inter is included under its font license.
