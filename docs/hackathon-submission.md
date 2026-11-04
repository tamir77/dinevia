# Dinevia — Menus Without Borders

## Product description

You are at a restaurant abroad. The menu is on your phone, but the dishes are unfamiliar, the prices are in another currency, and you still do not know what to order.

Dinevia helps you move from reading a menu to choosing a meal. Paste a restaurant menu link or photograph the menu. Read its dishes, descriptions and portions in your language, keep the original available to show your waiter, add food preferences, and see approximate prices in your currency.

The mobile-first guest experience supports English, German, Spanish, Italian, French, Chinese and Japanese. “For you” adds explained suggestions to the same readable menu, keeping dish details and original prices visible. Guests can distinguish a preference match from a conflict or an uncertain ingredient, without misleading match percentages.

Meta Muse Spark powers photo recognition, menu translation and preference reasoning. We validate structured responses, check that translated numbers match the source, and cache results so changing languages does not require recognizing the photograph again. Currency conversion uses published exchange rates and arithmetic rather than generated prices.

Dinevia starts with a familiar problem encountered in Moldovan restaurants and is designed for travelers wherever menus cross language barriers. The next step is restaurant-prepared menus that preserve their visual identity and can be shared through a QR code. The current public host page explains that direction; self-service host onboarding is not part of the guest demo.

Read every dish. Find your favorites. Feel at home at any table.

## How we use Meta

**Meta Model API / Muse Spark 1.3:** The application calls the Responses endpoint from the server. Spark reads restaurant-menu photos into structured text blocks, translates extracted menu content into the selected language, and reasons about guest food preferences using the dish name, description and culinary context. Recommendations include explanations tied to source text. The application validates the returned structure and evidence, preserves prices and quantities, and labels uncertainty instead of treating inferred recipes as verified ingredients.

**Muse Image 1.0 — experimental host path:** The code includes a separate workflow for replacing text inside a menu photograph while retaining its visual design. Spark reads the generated image back; numeric and text checks reject problematic results. This is an experimental extension, not the fast guest translation flow or a promise of pixel-identical output. Demonstrate it only with a verified recording of that workflow.

**What is implemented outside the model:** Page fetching and cleanup, session access, response validation, caching, menu rendering and exchange-rate arithmetic are application code. Google Analytics integration is planned for the published site; it does not perform translation. Development assistance is distinct from the Meta models serving users. Do not claim Muse Code was used without evidence.

## Why Meta matters

The input is not a clean sentence in a translation box. It may be a photographed page, a multilingual restaurant website, or a dish name whose ingredients are only partly described. Spark connects visual recognition, translation and contextual reasoning through one API, allowing the same source menu to support both reading and choosing.

Our contribution is the complete guest workflow around those capabilities: extract relevant menu content, retain originals and numeric details, reuse recognition across languages, and explain suggestions in place. Meta enables the semantic work; deterministic checks and explicit source references make the output easier to review.

## Three-minute demo outline

| Time | Screen | Story |
| --- | --- | --- |
| 0:00–0:20 | Dinevia opening and menu photograph | A menu can be readable on your phone and still leave you unsure what to order. |
| 0:20–1:05 | Actual photo import and translated result | Photograph the menu; Spark extracts and translates it. Show categories, descriptions, portions and unchanged original prices. Disclose any shortened processing wait. |
| 1:05–1:35 | Language change and original text | Recognition is reused. Switch language, then open the original so a waiter can identify the dish. |
| 1:35–2:10 | Preferences and “For you” | Add a like and an exclusion. Show a grounded match, a conflict and an explanation, with the normal menu still visible. |
| 2:10–2:30 | Currency control | Add an approximate converted price beside the original. Rates come from a published feed, not an AI estimate. |
| 2:30–2:50 | Simple architecture visual | Photo or link → extraction → Spark translation and reasoning → validation and cache → guest menu. Label host image reconstruction as experimental. |
| 2:50–3:00 | Dinevia closing | Local menu. Your language. Your preferences. Your currency. |

Use an owned or fictional menu for public video assets. Record actual application behavior. Recheck all claims against the deployed version before submitting; deployment and video URLs are still pending.
