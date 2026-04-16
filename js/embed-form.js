/**
 * embed-form.js - Fixed Turnstile + Formspree handler
 * No loops, no conflicts
 */

import SITE_CONFIG from './config.js';

function buildFormHTML(uid) {
    return `
<div class="waitlist-card">
  <div id="ef-form-container-${uid}">
    <form id="ef-waitlist-form-${uid}" class="ef-waitlist-form" novalidate>
      <div class="input-row">
        <input type="email" name="email" placeholder="your@email.com" required
               autocomplete="email" aria-label="Email address">
        <button type="submit" class="submit-btn" id="ef-sub-btn-${uid}">JOIN</button>
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
    
    // Track state
    let isSubmitting = false;
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

    async function submitToFormspree(token) {
        if (isSubmitting) return;
        isSubmitting = true;
        
        btn.textContent = '...';
        btn.disabled = true;
        
        try {
            const formData = new FormData(form);
            if (token) {
                formData.append('cf-turnstile-response', token);
            }
            
            const response = await fetch(action, {
                method: 'POST',
                body: formData,
                headers: { Accept: 'application/json' }
            });
            
            if (response.ok) {
                formWrap.classList.add('hidden');
                successWrap.classList.remove('hidden');
            } else {
                const data = await response.json();
                console.error('Formspree error:', data);
                btn.textContent = 'JOIN';
                btn.disabled = false;
                
                // Show error message
                if (data.errors) {
                    showEmailError(data.errors.map(e => e.message).join(', '));
                } else {
                    showEmailError('Something went wrong. Please try again.');
                }
            }
        } catch (error) {
            console.error('Network error:', error);
            btn.textContent = 'JOIN';
            btn.disabled = false;
            showEmailError('Network error. Please check your connection.');
        } finally {
            isSubmitting = false;
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate email
        if (!emailInput || !isValidEmail(emailInput.value)) {
            showEmailError('Please enter a valid email address (e.g. name@example.com)');
            emailInput?.focus();
            return;
        }
        clearEmailError();
        
        // Check if Turnstile is loaded
        if (typeof window.turnstile === 'undefined') {
            console.warn('Turnstile not loaded, submitting without CAPTCHA');
            await submitToFormspree(null);
            return;
        }
        
        // If Turnstile already rendered, don't render again
        if (turnstileWidgetId !== null) {
            return;
        }
        
        // Render Turnstile
        btn.textContent = 'VERIFYING...';
        btn.disabled = true;
        
        turnstileWidgetId = window.turnstile.render(captchaSlot, {
            sitekey: SITE_CONFIG.turnstile_sitekey,
            theme: 'dark',
            callback: async (token) => {
                // Success - submit the form
                await submitToFormspree(token);
                // Reset Turnstile for potential future submissions
                if (turnstileWidgetId !== null) {
                    window.turnstile.reset(turnstileWidgetId);
                }
            },
            'error-callback': () => {
                console.error('Turnstile error');
                btn.textContent = 'JOIN';
                btn.disabled = false;
                turnstileWidgetId = null;
                captchaSlot.innerHTML = '';
                showEmailError('Verification failed. Please try again.');
            },
            'expired-callback': () => {
                console.log('Turnstile expired');
                btn.textContent = 'JOIN';
                btn.disabled = false;
                turnstileWidgetId = null;
                captchaSlot.innerHTML = '';
                showEmailError('Verification expired. Please try again.');
            }
        });
    });
}

export function initEmbedForms() {
    const roots = document.querySelectorAll('.embed-form-root');
    roots.forEach((root, i) => {
        if (root.dataset.efInit === 'true') return;
        root.dataset.efInit = 'true';
        const uid = `ef-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 8)}`;
        initFormInstance(root, uid);
    });
}

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmbedForms);
} else {
    initEmbedForms();
}
