# DORNORI Website Management Manual
## Complete Configuration & Functionality Guide

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Configuration (config.js)](#core-configuration)
3. [Navigation System](#navigation-system)
4. [Page System & SPA](#page-system--spa)
5. [Theme System (Profiles)](#theme-system-profiles)
6. [Internationalization (i18n)](#internationalization-i18n)
7. [Shop/E-commerce System](#shope-commerce-system)
8. [Slideshow Component](#slideshow-component)
9. [Video System](#video-system)
10. [Footer Configuration](#footer-configuration)
11. [UI Features (Language, Currency, Cart)](#ui-features)
12. [Content Management](#content-management)
13. [Missing Features & Recommendations](#missing-features--recommendations)
14. [Module Standardization](#module-standardization)
15. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### High-Level Flow

```
Index.html (load CSS/fonts)
  ↓
site-boot.js (load config.js, shop modules)
  ↓
site-main.js (initialize nav, language, theme)
  ↓
page-loader.js (SPA router, content injection, mount components)
```

### Key Design Principles

1. **Vanilla JavaScript** — No frameworks. Clean, modular code with zero dependencies.
2. **Configuration-Driven** — Most features are toggleable in `config.js` without code changes.
3. **Modular Components** — Each feature (slideshow, video, cart) is self-contained and can be disabled.
4. **i18n-First** — All user-facing text lives in language JSON files (`lang/[code]/common.json`).
5. **Profile Theming** — Colors and CSS variables defined per theme profile in `css/profiles.css`.
6. **Feature Flags** — Optional features controlled by `config.features` object.
7. **Lazy Loading** — Components (shop, embeds, videos) load only when needed.

---

## Core Configuration

### Location
**File:** `js/config.js`

### Essential Settings

#### Appearance
```javascript
appearance: {
    base_path:  '/',                    // Path if site is in a subdirectory
    root_url:   'https://dornori.com',  // Full domain for canonical tags, emails
},
```

#### Shop Information
```javascript
shopName: "Dornori",
tagline:  "Curated lighting for modern spaces",
baseCurrency: "EUR",
defaultLanguage: "en",
supportedLanguages: ["en", "nl", "de", "fr", "es", "it", "pt", "cs"],
```

#### Paths (Auto-resolved with base_path)
```javascript
paths: {
    countries_file:  'data/countries.json',
    profiles_file:   'data/profiles.json',
    shipping_file:   'data/shipping.json',
    lang_dir:        'lang/',
    content_dir:     'content/',
    icons_dir:       'assets/icons/',
    shop_dir:        'shop/',
    js_dir:          'js/',
},
```

#### Storage Keys (for localStorage)
```javascript
storageKeys: {
    lang:          'dornori-lang',        // Language preference
    theme:         'dornori-theme',       // Profile/theme preference
    cart:          'dornori-cart',        // Shopping cart items
    currencyKey:   'webshop_currency',    // Selected currency
},
```

#### Feature Flags
```javascript
features: {
    showLanguageSwitcher: true,    // Top bar language dropdown
    showCurrencySelector: true,    // Top bar currency selector
    showGeoLanguagePopup: true,    // IP-based language suggestion on first visit
    CartLive: true,                // Shopping cart icon in nav (can be disabled)
},
```

#### Images
```javascript
images: {
    imageExt: "webp",              // Primary format (jpg fallback via <picture>)
    imageDir: "images/products/",  // Base directory for product images
},
```

#### Tax & Shipping
```javascript
taxRate:            0.21,              // VAT percentage
taxLabel:           "VAT (21%)",        // Display label
taxExemptCountries: [],                // Countries with no tax
businessVatExempt:  false,             // Business VAT exemption support

shipping: {
    freeThreshold: 150,     // Free shipping over this amount (€)
    base:          8.50,    // Base shipping cost (€)
    perKg:         1.20,    // Per kg additional cost
    maxFreeWeight: 20,      // Max weight for free shipping (kg)
    estimatedDays: "3–5",   // Display text for delivery estimate
},
```

#### API Endpoints
```javascript
endpoints: {
    formHandler:   'https://edge-form-handler-api.dornori-info.workers.dev',
    supportEmail:  'support@dornori.com',
    privacyEmail:  'privacy@dornori.com',
},
```

#### Payment (PayPal & Stripe)
```javascript
payment: {
    activeProcessor: "paypal",  // "paypal" or "stripe"
    paypal: {
        clientId: "",           // PayPal merchant client ID
        currency: "EUR",
        intent:   "capture",
    },
    stripe: {
        publishableKey: "pk_test_...",
        currency:       "eur",
        appearance: { /* Stripe UI theming */ }
    },
},
```

---

## Navigation System

### How It Works

The navigation is a **configuration-driven SPA menu** with support for:
- Parent nav items with **dropdown submenus** (Files → Python/Gallery, About → Terms/Privacy/Cookies)
- Internal pages (SPA links using slugs)
- External URLs (open in new tab)
- Icons loaded dynamically from `assets/icons/`
- Multilingual labels from `lang/[code]/common.json`

### Configuration

**File:** `config.js` → `navigation` array

```javascript
navigation: [
    {
        slug: 'files',
        icon: '3d-file-icon-200x200.svg',
        type: 'standard',
        enabled: true,
        children: [
            { slug: 'python', label: 'Python', enabled: true },
            { slug: 'gallery', label: 'Gallery', enabled: true }
        ]
    },
    {
        slug: 'about',
        icon: 'about-icon-200x200.svg',
        type: 'standard',
        enabled: true,
        children: [
            { slug: 'terms', label: 'Terms', 
              url: 'https://dornori.com/en/terms/', enabled: true },
            { slug: 'privacy', label: 'Privacy',
              url: 'https://dornori.com/en/privacy/', enabled: true },
        ]
    },
]
```

### Translation

**File:** `lang/[code]/common.json` → `nav` object

```json
{
  "nav": {
    "files": { "label": "Files", "mobileLabel": "Files" },
    "python": { "label": "Python" },
    "gallery": { "label": "Gallery" },
    "terms": { "label": "Terms" },
    "privacy": { "label": "Privacy" },
    "cookies": { "label": "Cookies" }
  },
  "url_slugs": {
    "files": "files",
    "python": "python",
    "gallery": "gallery",
    "terms": "terms",
    "privacy": "privacy"
  }
}
```

### How URLs Are Generated

1. **Parent item click** → Navigates to `/[lang]/[slug]/` (e.g., `/en/files/`)
2. **Child item (internal)** → Navigates to `/[lang]/[child-slug]/` (e.g., `/en/python/`)
3. **Child item (external URL)** → Opens in `_blank` with `noopener noreferrer`

### Styling

**Desktop:** Hover dropdown appears below parent (smooth fade-in via CSS variables)
**Mobile:** Expandable sections with animated chevron

**Theme-aware styling** via `css/profiles.css`:
- `--submenu-bg` — Opaque background per profile
- `--submenu-text` — Text color
- `--submenu-hover-bg` / `--submenu-hover-text` — Hover states
- `--submenu-shadow` — Drop shadow

### To Add a New Nav Item

1. Add to `config.js` → `navigation` array
2. Add label translations to all `lang/[code]/common.json` → `nav` object
3. Add URL slug to all `lang/[code]/common.json` → `url_slugs` object
4. Create content pages (if internal): `content/[code]/[slug].html` for each language
5. Optionally add icon: `assets/icons/[icon-name].svg`

---

## Page System & SPA

### How Pages Are Served

The website is a **Single Page Application (SPA)** that:
1. Loads a navigation click or URL
2. Fetches the corresponding HTML file from `content/[lang]/[slug].html`
3. Injects it into the DOM
4. Mounts any dynamic components (slideshows, shop embeds, etc.)
5. Updates URL without full page reload

### Pages Configuration

**File:** `config.js` → `pages` object

```javascript
pages: {
    about:     { file: 'about-us.html' },
    files:     { file: 'files.html' },
    python:    { file: 'python.html' },
    gallery:   { file: 'gallery.html' },
    shop:      { file: 'shop.html' },
    product:   { file: 'product.html' },
    cart:      { file: 'cart.html' },
    terms:     { file: 'terms.html' },
    privacy:   { file: 'privacy.html' },
    cookies:   { file: 'cookies.html' },
    // ... all other pages
},
```

### Adding a New Page

1. **Create the page content files:**
   ```
   content/en/my-page.html
   content/nl/my-page.html
   content/de/my-page.html
   (repeat for all 8 languages)
   ```

2. **Add to config.js:**
   ```javascript
   pages: {
       'my-page': { file: 'my-page.html' }
   }
   ```

3. **Add navigation item** (if you want it in the nav):
   ```javascript
   navigation: [
       { slug: 'my-page', icon: 'my-icon.svg', type: 'standard', enabled: true }
   ]
   ```

4. **Add translations:**
   ```json
   // lang/[code]/common.json
   {
       "nav": {
           "my-page": { "label": "My Page", "mobileLabel": "My Page" }
       },
       "url_slugs": {
           "my-page": "my-page"
       }
   }
   ```

### Page Content Structure

Pages use a simple **semantic HTML structure**:

```html
<div class="container">
    <h1>Page Title</h1>
    <p>Content goes here.</p>
</div>
```

The CSS handles responsive sizing and styling automatically via utility classes.

### Special Page Types

#### Shop Page (`shop.html`)
Shows product grid with filters, sorting, and shopping cart.

```html
<div class="container">
    <h1>Shop</h1>
    <div id="shop-embed-root"></div>
</div>
```

#### Product Page (`product.html`)
Displays a single product with images, description, variants, and add-to-cart.

```html
<div class="container">
    <div id="product-root" data-product-id=""></div>
</div>
```

Product ID is auto-detected from URL query param: `?id=product-id`

#### Cart Page (`cart.html`)
Shows shopping cart items, shipping options, and checkout flow.

```html
<div class="container">
    <div id="cart-root"></div>
</div>
```

---

## Theme System (Profiles)

### Concept

**Profiles** are named color themes. The site ships with 4 profiles:
1. **dark** — Dark theme (default)
2. **light** — Light theme
3. **cutting-mat** — Teal/green theme
4. **cutting-blue** — Blue theme

Each profile defines all CSS variables for the entire site, including:
- Background colors (`--bg`, `--bg-header`, `--bg-footer`, `--bg-card`)
- Text colors (`--text`, `--text-muted`, `--text-dim`)
- Accent/button colors
- Submenu colors
- And 50+ more variables

### Configuration

**File:** `css/profiles.css`

Example: Dark profile
```css
[data-theme="dark"] {
    --bg: #050505;
    --bg-header: #333333;
    --text: #BED4E1;
    --text-muted: #888888;
    --accent: #BED4E1;
    --submenu-bg: #333333;
    --submenu-text: #888888;
    --submenu-hover-bg: rgba(245, 242, 155, 0.12);
    --submenu-hover-text: #BED4E1;
    /* ... 50+ more variables ... */
}
```

### How to Change Colors

1. Open `css/profiles.css`
2. Find the `[data-theme="profile-name"]` block you want to edit
3. Change any CSS variable value
4. Test by selecting the profile in the top-right settings panel

**Example:** Change button color in dark theme
```css
[data-theme="dark"] {
    --btn-bg: #FF5733;      /* was #BED4E1 */
    --btn-text: #ffffff;    /* was #050505 */
}
```

### Available Themes

Open the **settings gear icon** (top-right) → **Profile dropdown**. Users can switch themes in real-time.

### Custom Color Variables by Feature

| Feature | Variables |
|---------|-----------|
| **Buttons** | `--btn-bg`, `--btn-text`, `--btn-bg-hover`, `--btn-text-hover` |
| **CTA Buttons** | `--btn-buynow-bg`, `--btn-buynow-text`, `--btn-buynow-bg-hover` |
| **Cart Icon** | `--cart-bg`, `--cart-text`, `--cart-bg-hover`, `--cart-text-hover` |
| **Toast/Notifications** | `--toast-bg`, `--toast-text` |
| **Submenus** | `--submenu-bg`, `--submenu-text`, `--submenu-hover-bg`, `--submenu-hover-text`, `--submenu-border`, `--submenu-shadow` |
| **Footer** | Fixed colors in CSS (intentionally not theme-dependent) |

---

## Internationalization (i18n)

### Architecture

The site supports **8 languages** with complete translation support:
- English (en)
- Dutch (nl)
- German (de)
- French (fr)
- Spanish (es)
- Italian (it)
- Portuguese (pt)
- Czech (cs)

### File Structure

```
lang/
├── en/
│   ├── common.json      (nav, ui, footer, slugs, 200+ strings)
│   ├── form.json        (form labels & validation messages)
│   └── products.json    (product names & descriptions)
├── nl/
├── de/
├── ... (6 more)
```

### How Language Selection Works

**Priority order:**
1. **URL path** — `/de/about/` → German
2. **Query param** — `?lang=fr` → French
3. **localStorage** — Saved preference
4. **Browser language** — Detected from `navigator.languages`
5. **Default** — English

### Common.json Structure

```json
{
  "nav": {
    "about": { "label": "About", "mobileLabel": "About" },
    "shop": { "label": "Shop", "mobileLabel": "Shop" }
  },
  "url_slugs": {
    "about": "about",
    "shop": "shop"
  },
  "ui": {
    "settings": "SETTINGS",
    "language": "LANGUAGE",
    "currency": "CURRENCY",
    "cart": "Cart",
    "add_to_cart": "Add to Cart",
    "buy_now": "Buy Now"
  },
  "footer": {
    "columns": [
      {
        "heading": "Company",
        "links": {
          "about": "About Us",
          "contact": "Contact"
        }
      }
    ]
  }
}
```

### Adding a New Translation String

1. **Add to all 8 language files:**
   ```json
   // lang/en/common.json
   "my_new_string": "Hello World"
   
   // lang/de/common.json
   "my_new_string": "Hallo Welt"
   ```

2. **Use in code:**
   ```javascript
   const text = window.T?.my_new_string || 'fallback';
   ```

3. **Or in HTML (if using template injection):**
   ```html
   <!-- Rendered server-side or via JS template -->
   <p>{T.my_new_string}</p>
   ```

### URL Slug Customization

Different languages can have different URL slugs for the same page:

```json
// lang/en/common.json
"url_slugs": {
  "about": "about"
}

// lang/de/common.json
"url_slugs": {
  "about": "uber-uns"  // Custom German slug
}
```

Result:
- English: `/en/about/`
- German: `/de/über-uns/`

---

## Shop/E-commerce System

### Core Functions (shop.js)

The shop system is a **self-contained module** that handles:
- Product catalog management
- Cart (add, remove, update quantities)
- Currency conversion (EUR, USD, GBP, etc.)
- Shipping calculations
- Tax handling
- Payment processing (PayPal, Stripe)
- Product variants & customization
- Discounts & promotions

### Product Data

**File:** `data/products.json`

```javascript
// Base product structure
{
  "pre-assembled": {
    "id": "pre-assembled",
    "category": "built",
    "price": 149.99,
    "weight": 0.5,
    "discount": 0,              // Optional: % discount
    "onSale": false,
    "image": "pre-assembled",   // Maps to images/products/pre-assembled.webp
    "variants": [               // Optional: variant IDs
      "pre-assembled-ufo",
      "pre-assembled-mushroom"
    ]
  }
}
```

### Translation

**File:** `lang/[code]/products.json`

```json
{
  "pre-assembled": {
    "name": "Ready-Made Star-A",
    "description": "Professional assembly included."
  }
}
```

### Displaying Products on a Page

Use **data attributes** to embed product cards:

```html
<!-- Single product card -->
<div data-shop-products="pre-assembled"></div>

<!-- With options -->
<div 
  data-shop-products="pre-assembled"
  data-variants
  data-related
  data-addons
></div>
```

**Attributes:**
- `data-variants` — Show variant selector dropdown
- `data-related` — Show related products below
- `data-addons` — Show optional add-ons

### Shop Grid

Full shop page with filtering:

```html
<div id="shop-embed-root"></div>
```

Automatically renders:
- Category filters
- Sorting options
- Product cards with pricing
- Add-to-cart functionality

### Cart System

**Stored in:** `localStorage[CONFIG.storageKeys.cart]`

**Features:**
- Persists across sessions
- Real-time currency conversion
- Automatic tax/shipping calculation
- Discount code support (extensible)

**To access cart in code:**
```javascript
const cart = Shop.getCart();
Shop.addToCart(productId, quantity);
Shop.removeFromCart(productId);
```

### Currency System

**Supported currencies** (defined in `data/countries.json`):
- EUR (€) — Default
- USD ($)
- GBP (£)
- And many more

**To change default currency:**
```javascript
// config.js
baseCurrency: "USD",
currencyCode: "USD",

// PayPal/Stripe
payment.paypal.currency: "USD",
payment.stripe.currency: "usd",
```

### Tax & VAT

**Configuration:**
```javascript
taxRate: 0.21,              // 21% VAT
taxLabel: "VAT (21%)",
taxExemptCountries: ["GB"], // Don't charge tax to UK
businessVatExempt: true,    // Support B2B VAT exemption
```

**Behavior:**
- Tax is **calculated per country** (from shipping address)
- Shows as separate line in cart
- Can be toggled off for B2B orders

### Shipping

**Calculation:** `base + (weight × perKg)`

```javascript
shipping: {
    freeThreshold: 150,    // Free over €150
    base: 8.50,            // €8.50 base
    perKg: 1.20,           // €1.20 per kg
    maxFreeWeight: 20,     // Weight limit for free shipping
    estimatedDays: "3–5",
},
```

**To customize:**
1. Edit shipping config in `config.js`
2. Or provide custom shipping methods via `data/shipping.json` (for multi-zone shipping)

### Payment Processors

#### PayPal

**Setup:**
1. Get **Client ID** from PayPal merchant dashboard
2. Add to `config.js`:
   ```javascript
   payment.paypal.clientId: "YOUR_CLIENT_ID"
   ```
3. PayPal button auto-renders on checkout

**Features:**
- Guest checkout
- No credit card form needed
- Handles currency conversion
- Return & cancel URLs auto-configured

#### Stripe

**Setup:**
1. Get **Publishable Key** from Stripe dashboard
2. Add to `config.js`:
   ```javascript
   payment.stripe.publishableKey: "pk_test_..."
   ```
3. Requires backend endpoint for payment intents
4. Custom appearance theming via CSS variables

**Features:**
- Credit card form (customizable via `appearance`)
- 3D Secure validation
- ACH, iDEAL, Klarna support
- Advanced fraud detection

### Advanced: Custom Discounts

To add time-limited promotions or coupon codes:

1. **Add to products.json:**
   ```json
   {
     "ufo": {
       "price": 199.99,
       "discount": 15  // 15% off
     }
   }
   ```

2. **Or via code:**
   ```javascript
   Shop.applyDiscount(productId, discountPercent);
   ```

---

## Slideshow Component

### Purpose

Display **image galleries** with auto-play, navigation, and touch support.

### Usage

Add to any page with a simple HTML element:

```html
<div 
  gallery-images="image1, image2, image3"
  gallery-folder="images/gallery/"
  gallery-size="16/9"
  gallery-mode="auto"
  gallery-interval="4000"
  gallery-controls="dots"
>
</div>
```

### All Options

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `gallery-images` | comma-separated names (no extension) | required | Image file names |
| `gallery-folder` | URL path | `''` | Base path to images |
| `gallery-size` | `800x400` or `16/9` or `1/1` | `16/9` | Dimensions or aspect ratio |
| `gallery-border` | `yes` \| `no` | `no` | Show border |
| `gallery-shape` | `rounded` \| `square` | `square` | Border radius |
| `gallery-mode` | `auto` \| `manual` | `manual` | Auto-advance slides |
| `gallery-interval` | milliseconds (e.g., `4000`) | `4000` | Time between auto-advances |
| `gallery-controls` | `dots` \| `none` | `dots` | Show pagination indicators |
| `gallery-fullbleed` | `yes` \| `no` | `no` | Break out of container (100vw) |

### Image Format

Images are loaded as **webp with jpg fallback**:

```
gallery-folder + imageName + .webp  (primary)
gallery-folder + imageName + .jpg   (fallback)
```

**Example:**
```
images/gallery/hero-1.webp
images/gallery/hero-1.jpg
```

### Interactions

| Device | Action | Result |
|--------|--------|--------|
| **Desktop** | Click left half | Previous slide |
| **Desktop** | Click right half | Next slide |
| **Desktop** | Click dot | Jump to slide |
| **Mobile** | Swipe left | Next slide |
| **Mobile** | Swipe right | Previous slide |
| **Mobile** | Tap dot | Jump to slide |
| **All** | Auto-play (if enabled) | Auto-advances every `gallery-interval` ms |
| **All** | Any interaction | Resets timer |

### Image Loading

- **On first run:** Slideshow waits for each image to load before showing
- **Deferred:** If timer fires before image ready, transition waits for load
- **Preload:** Automatically preloads the next slide in background

### Examples

**Simple gallery (manual, centered 800x600):**
```html
<div 
  gallery-images="photo1, photo2, photo3"
  gallery-folder="images/events/"
  gallery-size="800x600"
>
</div>
```

**Hero slideshow (auto-play, full-width, 16:9):**
```html
<div 
  gallery-images="hero-1, hero-2, hero-3"
  gallery-folder="images/hero/"
  gallery-mode="auto"
  gallery-interval="5000"
  gallery-fullbleed="yes"
  gallery-controls="dots"
>
</div>
```

**Product gallery (rounded, square images):**
```html
<div 
  gallery-images="product-view-1, product-view-2, product-view-3, product-view-4"
  gallery-folder="images/products/"
  gallery-size="400x400"
  gallery-shape="rounded"
  gallery-controls="dots"
>
</div>
```

### Styling via CSS

The slideshow uses standard CSS classes you can override:

```css
[gallery-images] {
    /* Container styles */
    margin-bottom: 3rem;
}

[gallery-images] img {
    /* Image styles */
    object-fit: cover;
}
```

### Troubleshooting Slideshows

**Problem:** Slides don't appear
- Check image paths match exactly (case-sensitive)
- Verify `gallery-folder` ends with `/`
- Ensure images exist as `.webp` or `.jpg`

**Problem:** Auto-play doesn't work
- Set `gallery-mode="auto"`
- Ensure `gallery-interval` is a valid number

**Problem:** Dots don't appear
- Set `gallery-controls="dots"`
- Check there are 2+ slides

---

## Video System

### Current Implementation

#### Hero Video (`hero-video.js`)

Used for large background/hero videos. Implemented with:
- **Lazy loading** — Videos load only after page is interactive
- **Poster image** — Shows while video loads
- **Preload attribute** — Set to `none` to save bandwidth

**HTML:**
```html
<video class="hero-video" poster="images/hero-poster.jpg" preload="none">
    <source src="videos/hero.mp4" type="video/mp4">
    <source src="videos/hero.webm" type="video/webm">
    Your browser doesn't support HTML5 video.
</video>
```

**Features:**
- Auto-mutes for auto-play (browsers require this)
- Responsive aspect ratio via CSS
- Fallback image on unsupported browsers

#### Embedded Videos

Videos can be embedded directly in page content via HTML:

```html
<video controls width="100%" style="max-width: 600px;">
    <source src="videos/tutorial.mp4" type="video/mp4">
    Fallback: <a href="videos/tutorial.mp4">Download video</a>
</video>
```

**Or using YouTube embed:**

```html
<iframe 
  width="100%" 
  height="400" 
  src="https://www.youtube.com/embed/VIDEO_ID" 
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
  allowfullscreen>
</iframe>
```

### Recommended: Unified Video Component

**Problem:** Current system is fragmented:
- Hero video has special lazy-loading logic
- Regular embeds are inline HTML
- No standardized configuration

**Proposed Solution:** Create `video.js` module (similar to slideshow):

```html
<!-- Proposed usage -->
<div 
  video-src="videos/tutorial.mp4"
  video-poster="images/poster.jpg"
  video-size="16/9"
  video-controls="yes"
  video-autoplay="no"
  video-muted="no"
  video-loop="no"
>
</div>
```

**Features to implement:**
- Unified config (like slideshow)
- WebM + MP4 format support
- Lazy loading (only load when in viewport)
- Poster image handling
- Accessibility (captions, keyboard controls)
- Responsive sizing
- YouTube/Vimeo fallback support

**Benefits:**
- Consistent with slideshow patterns
- Easy to add to any page via HTML only
- No JavaScript coding required
- Better performance (lazy load)
- Better UX (poster images, controls)

---

## Footer Configuration

### How Footers Work

The footer displays dynamically generated columns of links based on configuration.

### Configuration

**File:** `config.js` → `footer` array

```javascript
footer: [
    {
        label: 'Company',
        links: [
            { slug: 'gallery',  enabled: true  },
            { slug: 'about',    enabled: true  },
            { slug: 'contact',  enabled: true  },
            { slug: 'support',  enabled: true  },
        ]
    },
    {
        label: 'Legal',
        links: [
            { slug: 'terms',    enabled: true  },
            { slug: 'privacy',  enabled: true },
            { slug: 'cookies',  enabled: true },
            { slug: 'imprint',  enabled: true  },
            { slug: 'returns',  enabled: false },
            { slug: 'children', enabled: true },
            { slug: 'security', enabled: true },
        ]
    }
]
```

### Translations

**File:** `lang/[code]/common.json` → `footer` object

```json
{
  "footer": {
    "columns": [
      {
        "heading": "Company",
        "links": {
          "gallery": "Gallery",
          "about": "About Us",
          "contact": "Contact",
          "support": "Support"
        }
      },
      {
        "heading": "Legal",
        "links": {
          "terms": "Terms",
          "privacy": "Privacy Policy",
          "cookies": "Cookie Policy"
        }
      }
    ],
    "copyright": "© {year} {company}",
    "produced_by": "produced by"
  }
}
```

### Credit/Attribution

**File:** `config.js` → `credits` object

```javascript
credits: {
    companyName: 'DORNORI',
    creditLink: {
        text: 'dornori.info',
        url:  'https://dornori.info'
    }
}
```

Renders as: `© 2026 DORNORI | produced by dornori.info`

### To Add a Footer Link

1. **Add page configuration:**
   ```javascript
   // config.js
   pages: {
       'my-legal-page': { file: 'my-legal-page.html' }
   }
   ```

2. **Add to footer config:**
   ```javascript
   // config.js
   footer: [
       {
           label: 'Legal',
           links: [
               { slug: 'my-legal-page', enabled: true }
           ]
       }
   ]
   ```

3. **Add translations:**
   ```json
   // lang/en/common.json
   {
       "footer": {
           "columns": [{
               "heading": "Legal",
               "links": {
                   "my-legal-page": "My Legal Info"
               }
           }]
       },
       "url_slugs": {
           "my-legal-page": "my-legal-page"
       }
   }
   ```

4. **Create content:**
   ```
   content/en/my-legal-page.html
   content/nl/my-legal-page.html
   ... (all 8 languages)
   ```

---

## UI Features

### Language Switcher

**Enabled via:**
```javascript
features.showLanguageSwitcher = true
```

**Location:** Settings gear icon (top-right) → Language dropdown

**Behavior:**
- Shows all 8 languages with flags and labels
- On mobile, shows only language codes (2-letter)
- Clicking reloads page in new language
- Saves preference to localStorage

### Currency Selector

**Enabled via:**
```javascript
features.showCurrencySelector = true
```

**Location:** Settings gear icon (top-right) → Currency dropdown

**Behavior:**
- Shows supported currencies (EUR, USD, GBP, etc.)
- Updates all prices in real-time via currency exchange
- Saved to localStorage
- Auto-converts shipping & tax

**To change supported currencies:**
1. Edit `data/countries.json` — add/remove currency entries
2. Add exchange rates to `Shop.Currency` module (if different from market rates)

### Cart Icon

**Enabled via:**
```javascript
features.CartLive = true
```

**Location:** Right side of desktop nav, or in mobile footer

**Features:**
- Shows item count badge
- Hover shows cart preview
- Click navigates to cart page
- Real-time updates when items added

### Theme/Profile Selector

**Always enabled.**

**Location:** Settings gear icon (top-right) → Profile dropdown

**Shows:** All 4 available themes (dark, light, cutting-mat, cutting-blue)

**Behavior:**
- Clicking a theme immediately applies it
- Saves to localStorage
- All CSS updates via variables (no page reload needed)

### Geo-Language Popup

**Enabled via:**
```javascript
features.showGeoLanguagePopup = true
```

**Behavior:**
- Shows once per user (on first visit or new browser)
- Detects user's country via IP geolocation
- Maps country to preferred language (e.g., Germany → German)
- Offers to switch languages with "Accept" button
- Uses existing geolocation data (doesn't make extra API calls)

---

## Content Management

### File Structure

```
content/
├── en/          (English)
│   ├── about-us.html
│   ├── shop.html
│   ├── product.html
│   ├── python.html
│   └── ... (all pages)
├── nl/          (Dutch)
│   └── ... (copy of all pages with Dutch content)
├── de/          (German)
├── fr/          (French)
├── es/          (Spanish)
├── it/          (Italian)
├── pt/          (Portuguese)
└── cs/          (Czech)
```

### Page Content Guidelines

**Keep it simple.** Pages use semantic HTML with utility CSS classes:

```html
<div class="container">
    <h1>Page Title</h1>
    
    <section>
        <h2>Section Heading</h2>
        <p>Paragraph text.</p>
    </section>
    
    <!-- Slideshow -->
    <div gallery-images="img1, img2" gallery-folder="images/"></div>
    
    <!-- Embedded product -->
    <div data-shop-products="product-id"></div>
    
    <!-- Video -->
    <video controls>
        <source src="videos/file.mp4">
    </video>
    
    <!-- Form -->
    <form data-form="newsletter">
        <input type="email" name="email" placeholder="Email">
        <button type="submit">Subscribe</button>
    </form>
</section>
```

### HTML Classes Available

The site includes a lightweight CSS utility system. Common classes:

| Class | Purpose |
|-------|---------|
| `.container` | Center content, max-width 1440px |
| `.hero` | Full-width hero section |
| `.section` | Semantic section spacing |
| `.grid-2cols` | Two-column layout (auto-responsive) |
| `.button` | Styled button |
| `.accent` | Accent color text |
| `.muted` | Muted/secondary text |

### Best Practices

1. **Use semantic HTML** — `<h1>`, `<h2>`, `<section>`, `<article>`, `<p>`
2. **One `<h1>` per page** — Main page title
3. **Keep markup clean** — Avoid nested divs (CSS handles layout)
4. **Link internally** — Use `/[lang]/[slug]/` format
5. **Optimize images** — Provide `.webp` + `.jpg` via `<picture>`
6. **Test on mobile** — CSS is responsive-first

---
