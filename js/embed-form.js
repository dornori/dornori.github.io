/**
 * embed-form.js - Fixed with proper Turnstile handling (no loops)
 * Usage: <div class="embed-form-root"></div>
 */

import SITE_CONFIG from './config.js';

function buildFormHTML(uid) {
    return `
<div class="waitlist-card">
  <div id="ef-form-container-${uid}">
    <form id="ef-waitlist-form-${uid}" class="ef-waitlist-form" novalidate>
      <div class="input-row">
        <input type="email" name="email" placeholder="Subscribe" required
               autocomplete="email" aria-label="Email address">
        <button type="submit" class="submit-btn" id="ef-sub-btn-${uid}">Join</button>
      </div>
      <div id="ef-captcha-${uid}" class="ef-captcha-slot"></div>
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
    
    // Track if Turnstile is already rendered for this instance
    let turnstileRendered = false;
    let turnstileWidgetId = null;

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

    async function submitForm(token) {
        btn.textContent = '...';
        btn.disabled = true;
        
        try {
            // Create FormData and add the turnstile token
            const formData = new FormData(form);
            formData.append('cf-turnstile-response', token);
            
            const response = await fetch(action, {
                method: 'POST',
                body: formData,
                headers: { Accept: 'application/json' }
            });
            
            if (response.ok) {
                formWrap.classList.add('hidden');
                successWrap.classList.remove('hidden');
            } else {
                btn.textContent = 'JOIN';
                btn.disabled = false;
                // Reset turnstile so user can try again
                if (turnstileWidgetId !== null && window.turnstile) {
                    window.turnstile.reset(turnstileWidgetId);
                }
                turnstileRendered = false;
                turnstileWidgetId = null;
            }
        } catch (error) {
            console.error('Form submission error:', error);
            btn.textContent = 'JOIN';
            btn.disabled = false;
            if (turnstileWidgetId !== null && window.turnstile) {
                window.turnstile.reset(turnstileWidgetId);
            }
            turnstileRendered = false;
            turnstileWidgetId = null;
        }
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Validate email
        if (!emailInput || !isValidEmail(emailInput.value)) {
            showEmailError('Please enter a valid email address (e.g. name@example.com)');
            emailInput?.focus();
            return;
        }
        clearEmailError();

        // Check if Turnstile is available
        if (typeof window.turnstile === 'undefined') {
            console.error('Turnstile not loaded - refresh the page');
            btn.textContent = 'ERROR';
            setTimeout(() => { btn.textContent = 'JOIN'; }, 2000);
            return;
        }

        // Only render Turnstile once per form instance
        if (!turnstileRendered) {
            turnstileRendered = true;
            btn.textContent = 'VERIFYING...';
            btn.disabled = true;
            
            turnstileWidgetId = window.turnstile.render(captchaSlot, {
                sitekey: SITE_CONFIG.turnstile_sitekey,
                theme: 'dark',
                callback: (token) => {
                    // Success - submit the form
                    submitForm(token);
                },
                'error-callback': () => {
                    // Error - reset and let user try again
                    btn.textContent = 'JOIN';
                    btn.disabled = false;
                    turnstileRendered = false;
                    turnstileWidgetId = null;
                    captchaSlot.innerHTML = '';
                },
                'expired-callback': () => {
                    // Token expired - reset
                    btn.textContent = 'JOIN';
                    btn.disabled = false;
                    turnstileRendered = false;
                    turnstileWidgetId = null;
                    captchaSlot.innerHTML = '';
                }
            });
        }
    });
}

export function initEmbedForms() {
    const roots = document.querySelectorAll('.embed-form-root');
    roots.forEach((root, i) => {
        // Skip if already initialized
        if (root.dataset.efInit === 'true') return;
        root.dataset.efInit = 'true';
        const uid = `ef-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6)}`;
        initFormInstance(root, uid);
    });
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmbedForms);
} else {
    initEmbedForms();
}
