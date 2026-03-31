import SITE_CONFIG from './config.js';

export function initFormHandler() {
    const form = document.getElementById('waitlist-form');
    const btn = document.getElementById('sub-btn');
    const captchaContainer = document.getElementById('captcha-container');
    if (!form || !btn) return;

    const action = `https://formspree.io/f/${SITE_CONFIG.formspree_id}`;

    form.onsubmit = (e) => {
        e.preventDefault();
        
        // If captcha container is empty, render the Turnstile widget
        if (captchaContainer.innerHTML === "") {
            btn.innerText = "VERIFYING...";
            
            window.turnstile.render('#captcha-container', {
                sitekey: SITE_CONFIG.turnstile_sitekey,
                theme: 'dark',
                callback: function(token) {
                    // This function executes automatically once human check passes
                    executeSubmission(form, action, btn);
                },
                'error-callback': function() {
                    btn.innerText = "RETRY";
                    window.turnstile.reset();
                }
            });
        }
    };
}

async function executeSubmission(form, action, btn) {
    btn.innerText = "...";
    try {
        const response = await fetch(action, {
            method: 'POST',
            body: new FormData(form),
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            document.getElementById('form-container').classList.add('hidden');
            document.getElementById('success-container').classList.remove('hidden');
        } else {
            btn.innerText = "JOIN";
            window.turnstile.reset();
        }
    } catch (error) {
        btn.innerText = "JOIN";
        console.error("Submission error:", error);
    }
}
