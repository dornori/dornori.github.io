/**
 * embed-form.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Self-contained waitlist / subscribe form.
 *
 * USAGE — add this anywhere in any page:
 *
 *   <div class="embed-form-root"></div>
 *
 * Then load the script (after the Turnstile CDN script):
 *
 *   <script type="module" src="./js/embed-form.js"></script>
 *   <!-- or import it from another module: -->
 *   import { initEmbedForms } from './js/embed-form.js';
 *   initEmbedForms();
 *
 * Multiple instances on one page are fully supported — each one is
 * independent (its own Turnstile widget, its own success state).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import SITE_CONFIG from './config.js';

/* ─── HTML template ────────────────────────────────────────────────────────── */
function buildFormHTML(uid) {
    return /* html */`
<div class="waitlist-card">
  <div id="ef-form-container-${uid}">
    <form id="ef-waitlist-form-${uid}" class="ef-waitlist-form" novalidate>
      <div id="ef-captcha-${uid}" class="ef-captcha-slot"></div>
      <div class="input-row">
        <input type="email" name="email" placeholder="Subscribe" required
               autocomplete="email" aria-label="Email address">
        <button type="submit" class="submit-btn" id="ef-sub-btn-${uid}">Join</button>
      </div>
      <p class="disclaimer-text">
        By subscribing, you accept our
        <button type="button" class="link-btn" data-page="terms">Terms</button> &amp;
        <button type="button" class="link-btn" data-page="privacy">Privacy Policy</button>.
      </p>
      <div style="display:flex;justify-content:center;width:100%;">
        <span class="credit-item">
          <span class="status-dot"></span>POWERED BY <strong>FORMSPREE</strong>
        </span>
      </div>
    </form>
  </div>
  <div id="ef-success-container-${uid}" class="hidden">
    <p style="font-family:var(--font-mono);color:var(--accent);">Thanks for Subscribing!</p>
  </div>
</div>`;
}

/* ─── Per-instance initialiser ─────────────────────────────────────────────── */
function initFormInstance(root, uid) {
    root.innerHTML = buildFormHTML(uid);

    const form         = root.querySelector(`#ef-waitlist-form-${uid}`);
    const btn          = root.querySelector(`#ef-sub-btn-${uid}`);
    const captchaSlot  = root.querySelector(`#ef-captcha-${uid}`);
    const formWrap     = root.querySelector(`#ef-form-container-${uid}`);
    const successWrap  = root.querySelector(`#ef-success-container-${uid}`);

    if (!form || !btn) return;

    const action = `https://formspree.io/f/${SITE_CONFIG.formspree_id}`;

    /* wire up legal link buttons → viewPage if available */
    root.querySelectorAll('button[data-page]').forEach(b => {
        b.addEventListener('click', () => {
            if (typeof window.viewPage === 'function') {
                window.viewPage(b.getAttribute('data-page'));
            }
        });
    });

    form.addEventListener('submit', e => {
        e.preventDefault();
        /* Only render Turnstile widget on first submit attempt */
        if (captchaSlot.innerHTML.trim() === '') {
            btn.textContent = 'VERIFYING…';
            window.turnstile.render(captchaSlot, {
                sitekey: SITE_CONFIG.turnstile_sitekey,
                theme: 'dark',
                callback: () => executeSubmission(form, action, btn, formWrap, successWrap),
                'error-callback': () => {
                    btn.textContent = 'RETRY';
                    window.turnstile.reset(captchaSlot);
                }
            });
        }
    });
}

async function executeSubmission(form, action, btn, formWrap, successWrap) {
    btn.textContent = '…';
    try {
        const response = await fetch(action, {
            method: 'POST',
            body: new FormData(form),
            headers: { Accept: 'application/json' }
        });
        if (response.ok) {
            formWrap.classList.add('hidden');
            successWrap.classList.remove('hidden');
        } else {
            btn.textContent = 'JOIN';
            window.turnstile.reset();
        }
    } catch {
        btn.textContent = 'JOIN';
    }
}

/* ─── Public API ───────────────────────────────────────────────────────────── */

/**
 * Finds every `.embed-form-root` element in the document and renders
 * an independent form instance inside each one.
 *
 * Call this once after the DOM is ready.  Safe to call multiple times —
 * already-initialised roots (marked with data-ef-init) are skipped.
 */
export function initEmbedForms() {
    const roots = document.querySelectorAll('.embed-form-root');
    roots.forEach((root, i) => {
        if (root.dataset.efInit) return;          // skip if already done
        root.dataset.efInit = 'true';
        const uid = `${Date.now()}-${i}`;        // unique per instance
        initFormInstance(root, uid);
    });
}

/* Auto-init when the script is loaded directly (non-module usage) */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmbedForms);
} else {
    initEmbedForms();
}
