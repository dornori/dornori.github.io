# DORNORI Website — Quick Reference Guide

## Essential Files & What They Control

| File | Purpose | Edit When... |
|------|---------|----------|
| `js/config.js` | Master config (nav, pages, shop, payments, features) | Changing site structure, features, pricing |
| `css/profiles.css` | Theme colors for all 4 profiles | Changing button/text/accent colors |
| `css/components.css` | Component styling (nav, footer, submenu) | Changing fonts, spacing, animations |
| `lang/[code]/common.json` | UI text, nav labels, page slugs (all 8 languages) | Adding new nav items, buttons, translations |
| `lang/[code]/products.json` | Product names & descriptions | Editing product copy |
| `data/products.json` | Product catalog (prices, images, variants) | Editing products, adding discounts |
| `data/countries.json` | Shipping zones, currencies, languages | Adding countries, currencies |
| `content/[code]/[slug].html` | Page content for each language | Writing page content |

---

## Common Tasks

### Change a Button Color

1. Open `css/profiles.css`
2. Find `[data-theme="profile-name"]` section (e.g., `[data-theme="dark"]`)
3. Change: `--btn-bg: #NEWCOLOR;`
4. Save. Changes apply instantly.

**Example:**
```css
[data-theme="dark"] {
    --btn-bg: #FF5733;       /* Changed from #BED4E1 */
    --btn-text: #ffffff;
}
```

---

### Change a Product Price

1. Open `data/products.json`
2. Find product ID (e.g., "pre-assembled")
3. Change `"price": 149.99` to new price
4. Save. All product displays update.

**Example:**
```json
{
  "pre-assembled": {
    "price": 199.99,  // Changed from 149.99
    "discount": 10    // Optional: 10% off
  }
}
```

---

### Add a Product Discount

1. Open `data/products.json`
2. Add `"discount": 15` (15% off) to product
3. Save. Price displays with strikethrough + red price.

```json
{
  "product-id": {
    "price": 199.99,
    "discount": 15  // 15% off
  }
}
```

---

### Add a Navigation Item

1. Open `js/config.js`
2. Add to `navigation` array:
   ```javascript
   { slug: 'my-page', icon: 'icon.svg', type: 'standard', enabled: true }
   ```
3. Add labels to all 8 `lang/[code]/common.json` files:
   ```json
   "nav": {
       "my-page": { "label": "My Page", "mobileLabel": "My Page" }
   },
   "url_slugs": {
       "my-page": "my-page"
   }
   ```
4. Create content files:
   ```
   content/en/my-page.html
   content/nl/my-page.html
   ... (all 8 languages)
   ```

---

### Add a Submenu to a Nav Item

1. Open `js/config.js`
2. Find nav item and add `children` array:
   ```javascript
   {
       slug: 'files',
       icon: '3d-file-icon-200x200.svg',
       enabled: true,
       children: [
           { slug: 'python', label: 'Python', enabled: true },
           { slug: 'gallery', label: 'Gallery', enabled: true }
       ]
   }
   ```
3. Add translations to all `lang/[code]/common.json`:
   ```json
   "nav": {
       "python": { "label": "Python" },
       "gallery": { "label": "Gallery" }
   }
   ```

---

### Change Free Shipping Threshold

1. Open `js/config.js`
2. Find `shipping` object
3. Change `freeThreshold: 150` to new amount

```javascript
shipping: {
    freeThreshold: 200,  // Changed from 150
    base: 8.50,
    perKg: 1.20,
}
```

---

### Add a Slideshow to a Page

Add this HTML to `content/[lang]/[slug].html`:

```html
<div 
  gallery-images="image1, image2, image3, image4"
  gallery-folder="images/gallery/"
  gallery-size="16/9"
  gallery-mode="auto"
  gallery-interval="4000"
  gallery-controls="dots"
>
</div>
```

**Required:** Images must exist as:
- `images/gallery/image1.webp` + `image1.jpg`
- `images/gallery/image2.webp` + `image2.jpg`
- etc.

---

### Show a Product on a Page

Add this HTML to `content/[lang]/[slug].html`:

```html
<!-- Single product card -->
<div data-shop-products="product-id"></div>

<!-- With options (variants, related products, add-ons) -->
<div 
  data-shop-products="product-id"
  data-variants
  data-related
  data-addons
></div>
```

---

### Add a Footer Link

1. Open `js/config.js`
2. Find `footer` array
3. Add slug to appropriate column:
   ```javascript
   footer: [
       {
           label: 'Legal',
           links: [
               { slug: 'terms', enabled: true },
               { slug: 'my-new-legal-page', enabled: true }
           ]
       }
   ]
   ```
4. Add translations to all `lang/[code]/common.json`:
   ```json
   "footer": {
       "columns": [{
           "heading": "Legal",
           "links": {
               "my-new-legal-page": "My Legal Page"
           }
       }]
   }
   ```

---

### Change the Shop Name/Tagline

1. Open `js/config.js`
2. Change:
   ```javascript
   shopName: "Dornori",
   tagline:  "Curated lighting for modern spaces",
   ```

---

### Change Default Language

1. Open `js/config.js`
2. Change:
   ```javascript
   defaultLanguage: "en",  // Change to "de", "nl", etc.
   ```

---

### Disable Language Switcher

1. Open `js/config.js`
2. Change:
   ```javascript
   features: {
       showLanguageSwitcher: false,  // Was true
   }
   ```

---

### Disable Cart Icon

1. Open `js/config.js`
2. Change:
   ```javascript
   features: {
       CartLive: false,  // Was true
   }
   ```

---

### Change PayPal Merchant ID

1. Open `js/config.js`
2. Find `payment.paypal`
3. Change:
   ```javascript
   paypal: {
       clientId: "YOUR_NEW_CLIENT_ID",
   }
   ```

---

### Add a New Currency

1. Open `data/countries.json`
2. Find `currencies` object
3. Add:
   ```json
   {
       "code": "GBP",
       "symbol": "£",
       "rate": 0.87,
       "label": "British Pound"
   }
   ```
4. Open `js/config.js`
5. Update payment processors (PayPal, Stripe) to accept GBP

---

### Change Text on Every Page (e.g., "Add to Cart" → "Buy Now")

1. Open all `lang/[code]/common.json` files
2. Find `"ui"` object
3. Change `"add_to_cart"` value in each language file
4. All product pages update automatically

---

### Hide a Product from Shop

1. Open `data/products.json`
2. Change `"enabled": false` or remove from file
3. Product no longer appears in grid

**Or:** Disable just one variant:
```json
{
  "product-id": {
    "enabled": false  // Hides this product
  }
}
```

---

### See What Products Are on Sale

Open `data/products.json` and search for `"discount"`:

```json
{
  "ufo": { "discount": 15 },   // 15% off
  "mushroom": { "discount": 20 }  // 20% off
}
```

---

### Change Tax Rate

1. Open `js/config.js`
2. Change:
   ```javascript
   taxRate: 0.21,      // 21% VAT (was this)
   taxLabel: "VAT (21%)",
   ```

---

### Exempt a Country from Tax

1. Open `js/config.js`
2. Change:
   ```javascript
   taxExemptCountries: ["GB", "CH"],  // No tax for UK, Switzerland
   ```

---

### Add PayPal/Stripe Test Keys

1. Open `js/config.js`
2. Add test credentials:
   ```javascript
   payment: {
       activeProcessor: "paypal",
       paypal: {
           clientId: "Acz...",  // Sandbox client ID
       }
   }
   ```

---

## File Locations Cheat Sheet

```
dornori/
├── js/
│   ├── config.js              ← Master config (EDIT OFTEN)
│   ├── shop.js                ← Shop engine (don't edit)
│   ├── slideshow.js           ← Slideshow component (don't edit)
│   └── ... (other modules)
├── css/
│   ├── profiles.css           ← Theme colors (EDIT OFTEN)
│   ├── components.css         ← Component styling (EDIT SOMETIMES)
│   ├── layout.css             ← Layout rules (edit rarely)
│   └── variables.css          ← CSS variables (don't edit)
├── data/
│   ├── products.json          ← Product catalog (EDIT OFTEN)
│   ├── countries.json         ← Shipping/currencies (edit rarely)
│   ├── shipping.json          ← Shipping zones (edit rarely)
│   └── reviews.json           ← Reviews (edit manually or via admin)
├── lang/
│   ├── en/
│   │   ├── common.json        ← UI text in English (EDIT OFTEN)
│   │   ├── products.json      ← Product names in English
│   │   └── form.json          ← Form labels
│   ├── nl/, de/, fr/, ...     ← Repeat for all 8 languages
├── content/
│   ├── en/
│   │   ├── about-us.html      ← Page content in English (EDIT OFTEN)
│   │   ├── shop.html
│   │   └── ... (all pages)
│   ├── nl/, de/, fr/, ...     ← Repeat for all 8 languages
└── index.html                 ← Main entry point (don't edit)
```

---

## Language Codes

| Code | Language |
|------|----------|
| `en` | English |
| `nl` | Dutch |
| `de` | German |
| `fr` | French |
| `es` | Spanish |
| `it` | Italian |
| `pt` | Portuguese |
| `cs` | Czech |

When adding translations, remember **all 8 files must be updated**!

---

## Theme/Profile Names

| Name | Appearance |
|------|-----------|
| `dark` | Dark background, light text (default) |
| `light` | Light background, dark text |
| `cutting-mat` | Teal/green theme |
| `cutting-blue` | Blue theme |

Users can switch themes in settings (top-right gear icon).

---

## CSS Variables Reference

### Most Commonly Changed

```css
--bg              /* Page background */
--text            /* Main text color */
--text-muted      /* Secondary text */
--accent          /* Highlight color (links, buttons) */
--btn-bg          /* Button background */
--btn-text        /* Button text */
--border          /* Border color */
```

### Submenu-Specific

```css
--submenu-bg           /* Dropdown background */
--submenu-text         /* Dropdown text */
--submenu-hover-bg     /* Hover background */
--submenu-hover-text   /* Hover text */
--submenu-border       /* Border color */
--submenu-shadow       /* Drop shadow */
```

All defined in `css/profiles.css` per theme.

---

## Debugging Tips

### Check if a Module Loaded

Open DevTools Console (F12) and type:

```javascript
window.Shop          // Should return {object} if loaded
window.CONFIG        // Should return config object
window.T             // Should return translations
window.LANG          // Should return current language code
```

### View Current Theme/Profile

```javascript
document.documentElement.getAttribute('data-theme')
// Returns: "dark", "light", "cutting-mat", or "cutting-blue"
```

### Check Saved Preferences

```javascript
localStorage.getItem('dornori-lang')      // Saved language
localStorage.getItem('dornori-theme')     // Saved theme
localStorage.getItem('dornori-cart')      // Saved cart
localStorage.getItem('webshop_currency')  // Saved currency
```

### Force Clear Cache

```javascript
localStorage.clear()
location.reload()
```

---

## When to Reload vs. Auto-Update

**Auto-update (no reload needed):**
- Changing colors in `css/profiles.css`
- Changing text in language files (after language switch)
- Changing theme/language via settings panel
- Adding/removing products (if page not cached)

**Requires full page reload:**
- Changing `config.js` (navigation, pages, features)
- Changing HTML structure in content files
- Adding new language files
- Updating CSS class names

**Browser cache issue?**
```
Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
→ Clear all data from beginning of time
→ Hard reload page: Ctrl+F5 or Cmd+Shift+R
```

---

## Need Help?

**Check the full manual:** `DORNORI_WEBSITE_MANUAL.md`

**Common problems covered:**
- Language not switching
- Products don't show prices
- Slideshow images won't load
- Cart items not persisting
- Theme not changing
- Payment button missing

---

**Version:** 1.0  
**Last Updated:** June 2026
