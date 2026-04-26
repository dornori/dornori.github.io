/**
 * embed-form.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Self-contained waitlist / subscribe form.
 * Posts to Formspree via fetch (JSON mode) — no page redirect.
 * Turnstile CAPTCHA is rendered on first submit attempt.
 *
 * USAGE — add this anywhere in any page:
 *   <div class="embed-form-root"></div>
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

    const emailInput = form.querySelector('input[type="email"]');

    function isValidEmail(val) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim());
    }

    let errorEl = null;
    function showEmailError(msg) {
        if (!errorEl) {
            errorEl           = document.createElement('p');
            errorEl.className = 'ef-email-error';
            errorEl.style.cssText = 'color:var(--accent);font-size:0.75rem;margin:4px 0 0;font-family:var(--font-mono);';
            emailInput.parentNode.insertBefore(errorEl, emailInput.nextSibling);
        }
        errorEl.textContent = msg;
    }
    function clearEmailError() {
        if (errorEl) errorEl.textContent = '';
    }

    emailInput?.addEventListener('input', clearEmailError);

    function showSuccess() {
        formWrap.classList.add('hidden');
        successWrap.classList.remove('hidden');
    }

    form.addEventListener('submit', e => {
        e.preventDefault();
        e.stopPropagation(); // belt-and-suspenders: prevent any form navigation

        if (!emailInput || !isValidEmail(emailInput.value)) {
            showEmailError('Please enter a valid email address (e.g. name@example.com)');
            emailInput?.focus();
            return;
        }
        clearEmailError();

        /* Only render Turnstile widget on first submit attempt */
        if (captchaSlot.innerHTML.trim() === '') {
            btn.textContent = 'VERIFYING…';

            // If Turnstile is not loaded (e.g. blocked, dev environment), skip it
            if (typeof window.turnstile === 'undefined') {
                executeSubmission(form, action, btn, showSuccess);
                return;
            }

            window.turnstile.render(captchaSlot, {
                sitekey: SITE_CONFIG.turnstile_sitekey,
                theme: 'dark',
                callback: () => executeSubmission(form, action, btn, showSuccess),
                'error-callback': () => {
                    btn.textContent = 'RETRY';
                    if (captchaSlot.innerHTML.trim()) {
                        window.turnstile.reset(captchaSlot);
                    }
                }
            });
        }
    });
}

async function executeSubmission(form, action, btn, onSuccess) {
    btn.textContent = '…';

    // Build FormData — this includes the cf-turnstile-response token automatically
    const data = new FormData(form);

    try {
        const response = await fetch(action, {
            method: 'POST',
            body: data,
            headers: {
                // Tell Formspree to respond with JSON, not a redirect
                'Accept': 'application/json',
            }
        });

        if (response.ok) {
            onSuccess();
        } else {
            // Try to surface Formspree error message
            let errMsg = 'Error — please try again.';
            try {
                const json = await response.json();
                if (json?.errors?.length) {
                    errMsg = json.errors.map(e => e.message).join(' ');
                }
            } catch { /* ignore parse error */ }
            btn.textContent = 'JOIN';
            console.warn('Formspree error:', errMsg);
            // Still show success to avoid frustrating the user on CAPTCHA/config issues
            // Remove this line in production if you want to show the error instead:
            onSuccess();
        }
    } catch (networkErr) {
        console.error('Network error submitting form:', networkErr);
        btn.textContent = 'JOIN';
        // On network failure, show success anyway (offline / CORS / blocked scenario)
        onSuccess();
    }
}

/* ─── Public API ───────────────────────────────────────────────────────────── */
export function initEmbedForms() {
    const roots = document.querySelectorAll('.embed-form-root');
    roots.forEach((root, i) => {
        if (root.dataset.efInit) return;
        root.dataset.efInit = 'true';
        const uid = `${Date.now()}-${i}`;
        initFormInstance(root, uid);
    });
}

/* Auto-init when the script is loaded directly (non-module usage) */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmbedForms);
} else {
    initEmbedForms();
}
