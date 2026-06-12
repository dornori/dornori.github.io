
## Missing Features & Recommendations

### 1. ❌ Unified Video Component

**Current State:** Hero videos have special lazy-loading, embeds are inline HTML

**Recommendation:**
- Create `video.js` module (standardized like slideshow.js)
- Support WebM, MP4, YouTube, Vimeo
- Add lazy-load-on-viewport-enter
- Provide HTML config interface (no JS coding)

**Example implementation:**
```html
<div video-src="videos/demo.mp4" video-size="16/9" video-controls="yes" video-lazy="yes"></div>
```

---

### 2. ❌ Animation/Transition Library

**Current State:** Basic CSS transitions, no animation framework

**Recommendation:**
- Add simple fade-in, slide-in, zoom animations
- Use `IntersectionObserver` to trigger on scroll
- Keep it lightweight (vanilla CSS + JS triggers)
- Don't add animation framework dependencies

**Use case:** Fade in headings as user scrolls down page

---

### 3. ❌ Rich Text Editor for Page Content

**Current State:** Manual HTML editing in content files

**Recommendation:**
- Eventually: Simple markdown support in content files
- Or: Web-based content editor (admin panel) for non-developers
- For now: Keep as-is (allows fine control)

---

### 4. ❌ Reviews/Ratings System

**Current State:** Empty `data/reviews.json` exists, but no UI/functionality

**Recommendation:**
- Add star ratings on product pages
- Store reviews in `data/reviews.json`
- Moderate via admin panel
- Aggregate stats (average rating, total reviews)

**Example config in products.json:**
```json
{
  "product-id": {
    "rating": 4.5,
    "reviewCount": 24
  }
}
```

---

### 5. ❌ Analytics Integration

**Current State:** No analytics tracking

**Recommendation:**
- Add Google Analytics 4 (GA4) support
- Track page views, product views, cart additions
- Add event tracking for conversions

---

### 6. ❌ Email Notifications

**Current State:** Forms submit to Cloudflare Worker backend

**Recommendation:**
- Order confirmation emails (after payment)
- Shipment tracking emails
- Newsletter confirmation emails
- Support ticket confirmation emails

---

### 7. ❌ Advanced Shipping Options

**Current State:** Flat-rate shipping or weight-based

**Recommendation:**
- Integrate with shipping APIs:
  - DHL, FedEx, UPS for real-time rates
  - Or: Multiple predefined zones (EU/US/World)
- Let customers select delivery speed

---

### 8. ❌ Discount Code System

**Current State:** Discounts must be hardcoded in products.json

**Recommendation:**
- Add input field in cart for coupon codes
- Validate against list of active codes
- Support:
  - Percentage discounts (15% off)
  - Fixed amount ($10 off)
  - First-time customer only
  - Expiration dates
  - Minimum order amounts

---

### 9. ❌ Wishlist/Favorites

**Current State:** No wishlist feature

**Recommendation:**
- Add heart icon to product cards
- Store in localStorage
- Show dedicated wishlist page
- Email wishlist to friend

---

### 10. ❌ Better Mobile Optimization

**Current State:** Responsive CSS exists, but mobile UX could be smoother

**Recommendation:**
- Touch-optimized dropdowns (larger tap targets)
- Swipe gestures for navigation
- Better mobile footer layout (vertical stacking)
- Faster mobile checkout (fewer steps)

---

### 11. ❌ Search Functionality

**Current State:** No search/filter beyond shop categories

**Recommendation:**
- Full-text product search (client-side or server)
- Filter by price range, size, color
- Search in page content (FAQ, docs, etc.)

---

### 12. ✅ Blog/News System

**Current State:** Can be built with existing page system

**Recommendation:**
- Create `content/[lang]/blog/[post-slug].html` pages
- Add blog index page listing recent posts
- Add date/author metadata (in page header comments)
- Optional: RSS feed

---

## Module Standardization

### Pattern Recognition

The site uses consistent patterns for major components:

1. **Slideshow** — HTML attributes, no config file
2. **Shop** — Data-driven from `data/products.json`
3. **Navigation** — Config-driven from `config.js`
4. **Footer** — Config-driven from `config.js`
5. **Language/Currency** — Feature flags + localStorage

### Proposed Standardization

All **content components** should follow this pattern:

```html
<!-- Component with config attributes (no JS coding) -->
<div 
  component-name="options"
  component-option-1="value"
  component-option-2="value"
>
</div>
```

**Existing examples:**
- `gallery-images`, `gallery-size`, `gallery-mode` (slideshow)
- `data-shop-products`, `data-variants` (shop)

**To add:**
- `video-src`, `video-size`, `video-controls` (video)
- `testimonial-id`, `testimonial-style` (testimonials)
- `form-name`, `form-validation` (forms)

### Benefit

Users can add rich functionality to pages **without touching JavaScript**:
- Drag-and-drop WYSIWYG editors become possible
- Non-developers can build pages
- Consistency across components
- Easy testing/modifications

---

## Troubleshooting

### Common Issues

#### 1. Language Not Switching

**Symptom:** Clicking language selector doesn't change language

**Solution:**
1. Check `features.showLanguageSwitcher = true`
2. Verify all 8 `lang/[code]/common.json` files exist
3. Check browser console for fetch errors
4. Clear localStorage: `localStorage.clear()`

#### 2. Products Don't Show Prices

**Symptom:** Product cards appear but prices are blank

**Solution:**
1. Verify product exists in `data/products.json`
2. Check `.price` field is a number
3. Verify currency is in `data/countries.json`
4. Check `Shop` module loaded (`window.Shop` exists)
5. Open DevTools → Network tab → see if products.json fetched

#### 3. Slideshow Images Don't Load

**Symptom:** Blank gallery, no errors

**Solution:**
1. Check image paths:
   ```
   images/folder/name.webp
   images/folder/name.jpg
   ```
2. Verify `gallery-folder` ends with `/`
3. Check file names match exactly (case-sensitive)
4. Ensure both `.webp` and `.jpg` exist

#### 4. Cart Items Not Persisting

**Symptom:** Add item to cart, refresh page, cart is empty

**Solution:**
1. Check `localStorage` is enabled (not disabled in settings)
2. Check `CONFIG.storageKeys.cart` is correct
3. Verify cart data in DevTools → Application → localStorage
4. Check browser isn't in private/incognito mode

#### 5. Theme Not Changing

**Symptom:** Click profile selector, nothing happens

**Solution:**
1. Check `css/profiles.css` exists
2. Verify theme name in dropdown matches `[data-theme="name"]` in CSS
3. Check CSS variables are used in component CSS
4. Clear browser cache (Ctrl+Shift+Delete)

#### 6. Payment Button Doesn't Appear

**Symptom:** Checkout page shows no PayPal or Stripe button

**Solution:**
1. Check payment is enabled:
   ```javascript
   payment.activeProcessor = "paypal" // or "stripe"
   ```
2. For PayPal:
   - Verify `clientId` is set
   - Check no errors in console
3. For Stripe:
   - Verify `publishableKey` is set
   - Backend endpoint must be accessible

#### 7. Forms Not Submitting

**Symptom:** Click submit, nothing happens

**Solution:**
1. Check form endpoint in config:
   ```javascript
   endpoints.formHandler = "https://..."
   ```
2. Verify Cloudflare Worker is deployed
3. Check CORS headers in worker response
4. Check browser console for submission errors

#### 8. Navigation Links Broken

**Symptom:** Clicking nav items shows 404 or blank page

**Solution:**
1. Verify page slug in `config.js` → `pages`
2. Check content file exists: `content/[lang]/[slug].html`
3. Verify page has content (not empty)
4. Check `url_slugs` in `lang/[code]/common.json` match config

---

## Performance Optimization Tips

### 1. Image Optimization

- Use WebP format (JPG fallback via `<picture>`)
- Compress via TinyPNG, ImageOptim
- Use appropriate resolution per device
- Lazy-load images below fold

### 2. Code Splitting

- Shop modules only load if shop page visited
- Videos lazy-load on viewport enter
- Consider splitting large pages into multiple files

### 3. Caching

- Service worker (`sw.js`) caches static assets
- Browser caches CSS/JS (set via HTTP headers)
- localStorage caches user preferences & cart

### 4. Analytics

- Monitor Core Web Vitals (LCP, FID, CLS)
- Use Lighthouse for performance audits
- Set up monitoring for real user metrics

---

## Security Best Practices

### 1. XSS Prevention

- All HTML injection uses `innerHTML` carefully
- SVG content sanitized via `setSVGContent()` utility
- User input validated server-side (forms)

### 2. CSRF Protection

- Forms use Cloudflare Worker (handles tokens)
- Links use POST where appropriate (not query strings)

### 3. Data Privacy

- No user data logged locally except:
  - Cart (localStorage)
  - Language/currency preference
- Newsletter emails stored on Cloudflare Worker only
- Payment details never touched (PayPal/Stripe handle)

### 4. Content Security

- SVG icons loaded from trusted source
- External CDN scripts have subresource integrity (SRI) hashes
- Images hosted on same domain (no hot-linking)

---

## Deployment & Hosting

### Current Setup

- **Static hosting** (GitHub Pages, Netlify, Vercel)
- **CDN** for assets (images, CSS, JS)
- **Cloudflare Worker** for form submissions
- **No database required**

### To Deploy

1. **Push to GitHub:**
   ```bash
   git push origin main
   ```

2. **GitHub Pages auto-deploys** (if configured)

3. **Or deploy manually:**
   ```bash
   # Build (if needed)
   npm run build
   
   # Deploy
   netlify deploy --prod
   ```

### Environment Variables

See `js/env-config.js`:

```javascript
{
  root_url: process.env.ROOT_URL || 'https://dornori.com',
  api_endpoint: process.env.API_ENDPOINT || 'https://...'
}
```

Set via hosting provider (Netlify, Vercel, GitHub Secrets)

---

## Conclusion

The Dornori website is a **powerful, configuration-driven SPA** with excellent separation of concerns:
- **Config files** for structure (navigation, pages, shop)
- **JSON files** for content (translations, products, shipping)
- **CSS files** for styling (profiles, components)
- **JS modules** for functionality (shop, i18n, navigation)

With the recommendations above, the site can be extended to support:
- Better video experience (unified component)
- Reviews/ratings
- Discounts/coupons
- Advanced shipping
- Search/filtering
- And more

**Philosophy:** Keep it simple, configuration-driven, and vanilla JavaScript. This makes the site fast, maintainable, and easy to understand for future developers.

---

**Manual Version:** 1.0  
**Last Updated:** June 2026  
**Status:** Complete (ready for handoff)
