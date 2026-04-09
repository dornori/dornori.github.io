// js/main.js
import SITE_CONFIG from './config.js';

function initTheme() {
    const root = document.documentElement;
    const saved = localStorage.getItem('dornori-theme') || 'dark';
    root.setAttribute('data-theme', saved);
}

function initEmbedForm() {
    document.querySelectorAll('.embed-form').forEach(container => {
        container.innerHTML = `
            <div class="hero-form-block">
                <p class="headline">
                    "In darkness let's shine a light,<br>
                    to brighten the world and illuminate minds."
                </p>

                <div class="waitlist-card">
                    <form id="waitlist-form" method="POST">
                        <div class="input-row">
                            <input type="email" name="email" placeholder="your@email.com" required>
                            <button type="submit" class="submit-btn" id="sub-btn">JOIN</button>
                        </div>
                        <div id="captcha-container"></div>
                    </form>

                    <div id="success-container" class="hidden">
                        <p>Thanks for Subscribing!</p>
                    </div>

                    <p class="disclaimer-text">
                        By subscribing, you accept our 
                        <button class="link-btn" onclick="window.viewPage('terms')">Terms</button> &amp; 
                        <button class="link-btn" onclick="window.viewPage('privacy')">Privacy Policy</button>.
                    </p>
                </div>
            </div>
        `;
    });
}

function initPageLoader() {
    const homeView = document.getElementById('home-view');
    const pageView = document.getElementById('page-view');
    const pageContent = document.getElementById('page-content-inner');

    window.viewPage = async (slug) => {
        const page = SITE_CONFIG.pages[slug];
        if (!page) return;
        try {
            const res = await fetch(page.file);
            const html = await res.text();
            pageContent.innerHTML = html;
            homeView.classList.add('hidden');
            pageView.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error(err);
        }
    };

    window.showHome = () => {
        pageView.classList.add('hidden');
        homeView.classList.remove('hidden');
    };
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initPageLoader();
    initEmbedForm();
    console.log('%cDornori site loaded successfully', 'color:#BED4E1; font-family:monospace');
});
