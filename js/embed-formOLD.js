/**
 * embed-form.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Self-contained waitlist / subscribe form.
 * Posts to the configured form handler endpoint.
 * Turnstile CAPTCHA is rendered on first submit attempt.
 *
 * USAGE — add this anywhere in any page:
 *   <div class="embed-form-root"></div>
 */

import SITE_CONFIG from './config.js';
import ENV_CONFIG from './env-config.js';

/* ─── HTML template ────────────────────────────────────────────────────────── */
function buildFormHTML(uid) {
    const tf = (window.T && window.T.embedForm) || {};
    const placeholder  = tf.placeholder  || 'Subscribe';
    const joinLabel    = tf.join         || 'Join';
    const disclaimer   = tf.disclaimer   || 'By subscribing, you accept our';
    const termsLabel   = tf.terms        || 'Terms';
    const privacyLabel = tf.privacy      || 'Privacy Policy';
    return /* html */`
<div class="waitlist-card">
  <div id="ef-form-container-${uid}">
    <form id="ef-waitlist-form-${uid}" class="ef-waitlist-form" novalidate>
      <div id="ef-captcha-${uid}" class="ef-captcha-slot"></div>
      <div class="input-row">
        <input type="email" name="email" placeholder="${placeholder}" required
               autocomplete="email" aria-label="Email address">
        <button type="submit" class="submit-btn" id="ef-sub-btn-${uid}">${joinLabel}</button>
      </div>
      <p class="disclaimer-text">
        ${disclaimer}
        <button type="button" class="link-btn" data-page="terms">${termsLabel}</button> &amp;
        <button type="button" class="link-btn" data-page="privacy">${privacyLabel}</button>.
      </p>
      <div style="display:flex;justify-content:center;width:100%;">
        <span class="credit-item">
          <span class="status-dot"></span>SUBSCRIBE FOR UPDATES
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
        e.stopPropagation();

        if (!emailInput || !isValidEmail(emailInput.value)) {
            showEmailError('Please enter a valid email address (e.g. name@example.com)');
            emailInput?.focus();
            return;
        }
        clearEmailError();

        if (captchaSlot.innerHTML.trim() === '') {
            btn.textContent = 'VERIFYING…';

            if (typeof window.turnstile === 'undefined') {
                executeSubmission(btn, showSuccess);
                return;
            }

            window.turnstile.render(captchaSlot, {
                sitekey: SITE_CONFIG.turnstile.sitekey,
                theme: 'dark',
                callback: () => executeSubmission(btn, showSuccess),
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

async function executeSubmission(btn, onSuccess) {
    btn.textContent = '…';
    const emailInput = btn.closest('form')?.querySelector('input[type="email"]');
    const email = emailInput ? emailInput.value.trim() : '';
    try {
        const response = await fetch(SITE_CONFIG.endpoints.formHandler, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: 'newsletter', email })
        });
        await response.text();
        if (response.ok) {
            onSuccess();
        } else {
            throw new Error(response.status);
        }
    } catch (err) {
        if (ENV_CONFIG.DEBUG) console.error('Queue error submitting newsletter:', err);
        btn.textContent = 'JOIN';
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmbedForms);
} else {
    initEmbedForms();
}
