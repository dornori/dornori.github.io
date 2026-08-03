-- ============================================================================
-- Dornori Shop — SQL schema (alternative data source to the JSON files)
-- ----------------------------------------------------------------------------
-- Generated from data/products.json, data/countries.json, data/shipping.json
-- and lang/<code>/*.json. Standard SQL (SQLite/Postgres/MySQL-compatible —
-- adjust JSON column type if needed, e.g. JSONB on Postgres, JSON on MySQL).
--
-- This schema is NOT wired to a live backend. It exists so that:
--   1. dataSource: "sql" in js/config.js has something real to point at once
--      you stand up an API (see README "Switching to SQL") in front of it.
--   2. The full product/country/shipping objects are preserved as-is in a
--      `data` JSON column, since product records have deeply nested,
--      variable-shape fields (images[], variants[], colors[], bundle, specs
--      objects, etc.) that don't flatten cleanly into columns. Add typed
--      columns for anything you want to filter/sort on in real SQL — the
--      JSON column guarantees no data is lost in the meantime.
-- ============================================================================

DROP TABLE IF EXISTS product_translations;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS countries;
DROP TABLE IF EXISTS shipping_settings;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS lang_common;

-- ── Products ────────────────────────────────────────────────────────────────
-- Core fields kept as real columns for querying; everything else (images,
-- variants, colors, bundle, specs, ...) lives in `data`.
CREATE TABLE products (
    id            TEXT PRIMARY KEY,
    sku           TEXT,
    price         REAL NOT NULL,
    discount      REAL DEFAULT 0,
    weight        REAL,
    stock         INTEGER DEFAULT 0,
    category      TEXT,
    rating        TEXT,
    review_count  TEXT,
    sort_order    INTEGER,
    data          JSON NOT NULL   -- full product object, same shape as data/products.json entries
);

-- ── Per-language product text overrides ────────────────────────────────────
-- Mirrors lang/<code>/products.json: name/description/etc. text only — no
-- prices, ids, paths. Falls back to products.data if a key is missing for
-- a language.
CREATE TABLE product_translations (
    product_id    TEXT NOT NULL REFERENCES products(id),
    lang          TEXT NOT NULL,
    data          JSON NOT NULL,  -- { name, description, ... } text fields for this product+lang
    PRIMARY KEY (product_id, lang)
);

-- ── Countries (currency, shipping region, language mapping) ───────────────
CREATE TABLE countries (
    code                  TEXT PRIMARY KEY,   -- ISO 3166-1 alpha-2
    language              TEXT,
    label                 TEXT,
    flag                  TEXT,
    hreflang              TEXT,
    currency              TEXT,
    region                TEXT,
    group_label           TEXT,
    active                INTEGER DEFAULT 1,  -- 0/1
    currency_symbol       TEXT,
    currency_name         TEXT,
    currency_rate_to_eur  REAL,
    currency_decimals     INTEGER,
    currency_locale       TEXT
);

-- ── Shipping settings (key/value; mirrors data/shipping.json "settings") ──
CREATE TABLE shipping_settings (
    key    TEXT PRIMARY KEY,
    value  TEXT,        -- stored as text; cast in application code (numbers, nulls, strings all appear here)
    unit   TEXT,
    notes  TEXT
);

-- ── Reviews & rating breakdown per product ─────────────────────────────────
-- Mirrors data/reviews.json: keyed by product id, each holding a rating
-- breakdown, video list, and the review list. Kept as JSON since reviews have
-- variable per-review fields (images[], verified, helpful count, ...).
CREATE TABLE reviews (
    product_id    TEXT PRIMARY KEY REFERENCES products(id),
    data          JSON NOT NULL   -- { ratingBreakdown, videos, reviews } — same shape as data/reviews.json[product_id]
);

-- ── UI strings per language (mirrors lang/<code>/common.json) ─────────────
CREATE TABLE lang_common (
    lang   TEXT PRIMARY KEY,
    data   JSON NOT NULL   -- full common.json object for this language
);
