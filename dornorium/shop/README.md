# Dornori Shop/Cart — Standalone Module

The shop grid, product page, cart/checkout, and order-confirmation page,
isolated from the full dornori.com site so they can be developed, hosted,
or tested independently.

## What's in here

```
index.html            simple landing page linking to shop, cart, reviews, gallery
shop.html             shop homepage — full product grid (Shop.renderShop)
product.html          product detail page (?id=<product-id>)
cart.html             2-step cart + checkout (PayPal / Google Pay / Apple Pay / card)
success.html          order confirmation page
reviews.html          customer reviews + video carousel for a product (?id=<product-id>)
gallery.html          feature-flags showcase — demonstrates the data-shop-products
                      embed flags (data-variants / data-related / data-addons) used
                      to control what a product card shows. Not part of the shopping
                      flow itself; a reference/demo page.

css/
  dornorium.css    base reset + theme variables (the shared stylesheet you added)
  shop.css         shop/cart/PDP component styles
  shop-bridge.css  color-variable bridge layer used by shop.css
  product.css      PDP-specific styles
  chrome.css       small header/nav/cart-icon/lang-switcher styling (see note below)

js/
  config.js            site config: shop name, currency, tax/shipping defaults,
                       payment provider keys, storage keys, supportedLanguages,
                       dataSource ("json" | "sql")
  standalone-boot.js   replaces site-boot.js. Sets SHOP_CONFIG/BASE_PATH,
                       loads lang/<lang>/common.json into window.T
  shop-init.js         boot sequence: points CONFIG.data.* at JSON files or the SQL
                       API depending on CONFIG.dataSource → loads currency/shipping/
                       payment → shop.js → renders cart icon + currency + language UI
  shop.js              the shop engine: cart, products, pricing, rendering, i18n
  cart-integration.js  talks to your payment worker (pay.dornori-info.workers.dev)
  modules/
    currency.js        currency list + conversion (reads data/countries.json or the SQL API)
    shipping.js        shipping cost calc (reads data/shipping.json or the SQL API)
    payment.js         PayPal / Stripe / Google Pay / Apple Pay integration

data/
  products.json, countries.json, shipping.json, reviews.json   — JSON data source (default)
  schema.sql, seed.sql                            — SQL data source (alternative,
                                                     see "Switching to SQL" below)

lang/<code>/
  common.json, products.json   — UI strings + product-text overrides, one folder
                                 per language. Ships with en, de, es, fr, it, nl, pt, cs.
```

## What changed vs. the full site's copies

The shop engine itself needed **no logic changes** — it's plain scripts, no
build step, no ES module imports, and already reads all its data through
`CONFIG.data.*` paths with safe fallbacks. It genuinely was already close to
standalone.

The one real dependency was folder-based routing: the full site serves pages
at `/en/product/`, `/en/cart/`, etc., and `shop.js`/`shop-init.js` build links
like `/en/product/?id=123` accordingly. Since this module is flat
(`product.html`, `cart.html` at the root, single language), I patched every
spot that assumed that folder structure to use flat filenames instead:

- `shop.js` — product card links, cart hover-panel links, buy-now widget
- `shop-init.js` — the cart-icon URL helper; also disabled `_patchProductLinks()`,
  which existed only to rewrite flat links *into* the folder form (would have
  undone the fix above)
- `cart.html` — the post-payment redirect to the success page
- `product.html` — the "Buy Now → cart" redirect, and the related-products
  card click handlers
- `success.html` — "Continue shopping" / "Return to cart" links, and two
  `fetch('/data/...')` calls that were rewritten to relative paths

Every change is commented in place with `STANDALONE MODULE:` so they're easy
to find and equally easy to revert if this ever gets folded back into the
full site's folder structure.

`css/chrome.css` is genuinely new — a ~60-line header/nav/footer stylesheet.
The full site's header/nav come from `layout.css`/`components.css`
(nav dropdowns, mobile menu, hero video, multi-language switcher — none of
it shop-specific), which I left behind on purpose rather than drag in. This
gives just enough chrome to move between shop → product → cart → success.

## Known gaps (not fixed, out of scope for "shop and cart")

- **No product images.** The uploaded site export didn't include an
  `images/` folder, so product photos will 404. Drop your `images/products/`
  folder in at the root and they'll resolve (`data/products.json` already
  points at `images/products/<slug>.webp`).
- ~~**English only.**~~ Fixed — `supportedLanguages` in `config.js` now lists
  `en, de, es, fr, it, nl, pt, cs` (same set as the full site's fallback
  languages), and `lang/<code>/common.json` + `products.json` ship for each.
  The language switcher (`#lang-switcher-slot` in the header, wired via
  `Shop.wireLanguageSwitcher` / `Shop.switchLanguage`) is now rendered on
  gallery.html, product.html, cart.html, and success.html. To add another
  language later: drop `lang/<code>/common.json` + `products.json` in
  (same shape as the existing ones) and add the code to `supportedLanguages`
  — no other code changes needed.
- **The reviews link** on the product page (star rating → review count) still
  points at `/en/reviews/?id=...`, which doesn't exist in this module. It's a
  no-op until clicked; reviews weren't part of "shop and cart" so I left it.
- **Checkout still calls your live Cloudflare Worker**
  (`pay.dornori-info.workers.dev`) for order creation/capture/stock, and
  `dornori-ticketing.dornori-info.workers.dev` for the confirmation-email
  ticket. Nothing to change there — that's your backend either way, and it's
  unrelated to `product-management-system-v3`.

## Switching to SQL

By default `dataSource: "json"` in `js/config.js` reads `data/products.json`,
`data/countries.json`, and `data/shipping.json` directly — no backend needed.

`data/schema.sql` and `data/seed.sql` define an equivalent SQL data source
(products, product_translations, countries, shipping_settings, lang_common
tables), generated from those same JSON files — nothing is out of sync. There's
no live database behind this yet; the two files are there so you can stand
one up when you're ready:

1. Run `schema.sql` then `seed.sql` against SQLite/Postgres/MySQL (the seed
   file uses `INSERT OR IGNORE` for one duplicate country code in the source
   data — swap that for `ON CONFLICT DO NOTHING` / `INSERT IGNORE` on
   Postgres/MySQL).
2. Put a small read-only API in front of it with three routes that return the
   *exact same JSON shape* as the files they replace:
   `GET /products`, `GET /countries`, `GET /shipping`.
3. Set `endpoints.api` in `js/config.js` to that API's base URL and flip
   `dataSource` to `"sql"`. `shop-init.js` picks it up automatically — no
   other code changes anywhere else in the module.

Per-language product text (`product_translations`) and UI strings
(`lang_common`) are in the schema too, keyed by `lang`, if you want the API to
serve those as well instead of the static `lang/<code>/*.json` files.

## `product-management-system-v3`

Worth flagging: that earlier attempt is a *different* piece of work — a
Cloudflare D1/Worker backend for product/stock management (admin panel,
stock ledger), not a shop/cart isolation. It's not a partial version of
this; the two don't overlap. If you do want the storefront reading from
that D1 worker instead of the static `data/products.json` shipped here, its
`patches/shop-init.js` and `patches/payment.js` are meant to drop in on top
of this — but that's a separate follow-up, not something this package needs.

## Running it

Any static file server works — from this folder:

```
npx serve .
# or
python3 -m http.server 8080
```

Then open `/gallery.html` (the shop homepage — `/shop.html` redirects there).
