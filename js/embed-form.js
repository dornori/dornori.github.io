/**
 * embed-form.js - Waitlist form with Turnstile CAPTCHA
 * Usage: <div class="embed-form-root"></div>
 */

import SITE_CONFIG from './config.js';

function buildFormHTML(uid) {
    return `
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
    </form>
  </div>
  <div id="ef-success-container-${uid}" class="hidden">
    <p style="font-family:var(--font-mono);color:var(--accent);">Thanks for Subscribing!</p>
  </div>
</div>`;
}

function initFormInstance(root, uid) {
    root.innerHTML = buildFormHTML(uid);

    const form = root.querySelector(`#ef-waitlist-form-${uid}`);
    const btn = root.querySelector(`#ef-sub-btn-${uid}`);
    const captchaSlot = root.querySelector(`#ef-captcha-${uid}`);
    const formWrap = root.querySelector(`#ef-form-container-${uid}`);
    const successWrap = root.querySelector(`#ef-success-container-${uid}`);

    if (!form || !btn) return;

    const action = `https://formspree.io/f/${SITE_CONFIG.formspree_id}`;
    const emailInput = form.querySelector('input[type="email"]');

    function isValidEmail(val) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim());
    }

    let errorEl = null;
    function showEmailError(msg) {
        if (!errorEl) {
            errorEl = document.createElement('p');
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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!emailInput || !isValidEmail(emailInput.value)) {
            showEmailError('Please enter a valid email address (e.g. name@example.com)');
            emailInput?.focus();
            return;
        }
        clearEmailError();

        // Check if Turnstile is loaded
        if (typeof window.turnstile === 'undefined') {
            console.error('Turnstile not loaded');
            btn.textContent = 'ERROR';
            setTimeout(() => { btn.textContent = 'JOIN'; }, 2000);
            return;
        }

        // Only render Turnstile on first submit
        if (captchaSlot.innerHTML.trim() === '') {
            btn.textContent = 'VERIFYING...';
            window.turnstile.render(captchaSlot, {
                sitekey: SITE_CONFIG.turnstile_sitekey,
                theme: 'dark',
                callback: async (token) => {
                    btn.textContent = '...';
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
                            window.turnstile.reset(captchaSlot);
                        }
                    } catch {
                        btn.textContent = 'JOIN';
                        window.turnstile.reset(captchaSlot);
                    }
                },
                'error-callback': () => {
                    btn.textContent = 'RETRY';
                    window.turnstile.reset(captchaSlot);
                }
            });
        }
    });
}

export function initEmbedForms() {
    const roots = document.querySelectorAll('.embed-form-root');
    roots.forEach((root, i) => {
        if (root.dataset.efInit) return;
        root.dataset.efInit = 'true';
        const uid = `${Date.now()}-${i}`;
        initFormInstance(root, uid);
    });
}

// Auto-init when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmbedForms);
} else {
    initEmbedForms();
}
