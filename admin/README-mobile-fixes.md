# Mobile Fixes — What Was Broken & How to Avoid It

## What was fixed (v3)

### 1. Sticky image "hangs" while text scrolls
**Files:** `css/product.css`, `css/pages.css`

`position: sticky` makes an element pin in place while the rest of the page scrolls past it. Great on desktop (Amazon-style gallery), broken on mobile where the layout is already single-column — the image just sits frozen while text runs underneath it.

**Fix applied:**
```css
/* product.css */
@media (max-width: 640px) {
  .pdp-gallery { position: static; }
  .pdp-buybox  { position: static; }
}

/* pages.css */
@media (max-width: 768px) {
  .built-intro__product-slides { position: static; }
}
```

**Rule for future pages:** Any time you use `position: sticky`, add a mobile override that sets it back to `static`. Sticky only makes sense when there's enough scrollable content beside it — i.e. two-column layouts.

---

### 2. Floated images crushing text on mobile
**File:** `css/pages.css`

The `style-1` (float:right) and `style-4`/`style-5` (float:left) classes are used in content pages (kit, parts, security, returns, etc.) to place images beside text. On a 390px phone a 45%-wide floated image leaves only ~200px for text — unreadable.

**Fix applied:**
```css
@media (max-width: 768px) {
  .style-1,
  .style-4,
  .style-5 {
    float: none;
    width: 100%;
    min-width: 0;
    margin: 0 0 1.5rem 0;
  }
}
```

**Rule for future pages:** Every float needs a mobile unfloat. The pattern is always:
```css
/* Desktop: image beside text */
.your-image {
  float: right;          /* or left */
  width: 45%;
  margin: 0 0 1.5rem 2rem;
}

/* Mobile: image above text */
@media (max-width: 768px) {
  .your-image {
    float: none;
    width: 100%;
    min-width: 0;
    margin: 0 0 1.5rem 0;
  }
}
```

Also wrap the float+text block in a `clearfix` div so the container doesn't collapse:
```html
<div class="overflow-wrap clearfix">
  <img class="style-1" src="..." />
  <p>Text here...</p>
</div>
```

---

### 3. Hover card lifts "sticking" on touch
**File:** `css/layout.css`

Cards with `transform: translateY(-6px)` on `:hover` look great on desktop. On touch devices the hover fires on tap and the card stays lifted — there's no "mouse out" event to reset it.

**Fix applied:**
```css
@media (hover: none) {
  .card__way:hover,
  .home-way:hover,
  .home-usp:hover,
  .option-card:hover {
    transform: none;
    box-shadow: none;
  }
}
```

**Rule for future pages:** Use `@media (hover: none)` — not `@media (max-width: ...)` — to suppress hover effects. This correctly targets touch devices regardless of screen size (tablets included), without breaking desktop small-window views.

---

### 4. Hero overlays overlapping on tiny screens
**File:** `css/layout.css`

The hero video has 4 corner overlays. On screens narrower than 420px the right-side overlays collide with left-side content.

**Fix applied:**
```css
@media (max-width: 420px) {
  .overlay-right-upper,
  .overlay-right-lower { display: none; }
  .overlay-left-lower  { position: static; margin-top: 1rem; }
}
```

**Rule for future pages:** When you add overlay text to a hero, test at 390px (iPhone SE) and 375px. If it overlaps, hide the less important corner or reduce font size aggressively before hiding.

---

## General rules for new pages

### Sticky
Only use on the **minority column** of a two-column layout. Always add:
```css
@media (max-width: 768px) {
  .your-sticky-thing { position: static; }
}
```

### Floats
Always pair every float with an unfloat at 768px. Use `overflow-wrap clearfix` on the parent.

### Grids
Multi-column grids (3–4 col) should step down progressively:
```css
.your-grid { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 960px) { .your-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .your-grid { grid-template-columns: 1fr; } }
```

### Hover effects
For any card/button with a `:hover` transform or box-shadow, add:
```css
@media (hover: none) {
  .your-card:hover { transform: none; box-shadow: none; }
}
```

### Font sizes
Avoid fixed `px` sizes for headings. Use `clamp()` — already set up in `base.css` for h1–h3. For custom headings:
```css
font-size: clamp(1rem, 2.5vw, 1.5rem); /* min, fluid, max */
```

### Touch targets
Buttons and links need at least 44×44px tap area on mobile. If a button looks too small, add:
```css
@media (max-width: 768px) {
  .your-button { min-height: 44px; padding: 12px 20px; }
}
```

---

## Breakpoints in this project

| Variable | Value | Use for |
|---|---|---|
| `--breakpoint-sm` | 480px | Small phones, single-column grids |
| `--breakpoint-md` | 760px | Tablet portrait, unfloat images |
| `--breakpoint-lg` | 1000px | Tablet landscape, collapse 3-col → 2-col |
| `--breakpoint-xl` | 1280px | Wide desktop |

Note: CSS media queries can't use custom properties directly — use the raw `px` values in `@media` rules but keep them consistent with the variables above.
