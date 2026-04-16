import SITE_CONFIG from './config.js';

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
        <a href="#" data-page="terms">Terms</a> &amp;
        <a href="#" data-page="privacy">Privacy Policy</a>.
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

function initFormInstance(root, uid) {
    root.innerHTML = buildFormHTML(uid);

    const form = root.querySelector(`#ef-waitlist-form-${uid}`);
    const btn = root.querySelector(`#ef-sub-btn-${uid}`);
    const captchaSlot = root.querySelector(`#ef-captcha-${uid}`);
    const formWrap = root.querySelector(`#ef-form-container-${uid}`);
    const successWrap = root.querySelector(`#ef-success-container-${uid}`);

    if (!form || !btn) return;

    const action = `https://formspree.io/f/${SITE_CONFIG.formspree_id}`;

    root.querySelectorAll('[data-page]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const slug = el.getAttribute('data-page');
            if (slug) {
                const lang = window.LANG || SITE_CONFIG.default_language;
                window.location.href = SITE_CONFIG.getPageUrl(lang, slug);
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

    form.addEventListener('submit', e => {
        e.preventDefault();

        if (!emailInput || !isValidEmail(emailInput.value)) {
            showEmailError('Please enter a valid email address (e.g. name@example.com)');
            emailInput?.focus();
            return;
        }
        clearEmailError();

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
