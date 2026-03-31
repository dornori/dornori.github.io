import SITE_CONFIG from './config.js';

export function initFormHandler() {
    const form = document.getElementById('waitlist-form');
    if (!form) return;

    form.action = `https://formspree.io/f/${SITE_CONFIG.formspree_id}`;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('sub-btn');
        btn.innerText = "...";
        
        try {
            const res = await fetch(form.action, { 
                method: 'POST', 
                body: new FormData(form), 
                headers: { 'Accept': 'application/json' } 
            });
            
            if (res.ok) {
                document.getElementById('form-container').classList.add('hidden');
                document.getElementById('success-container').classList.remove('hidden');
            } else {
                btn.innerText = "Join";
            }
        } catch (err) {
            btn.innerText = "Join";
        }
    };
}
