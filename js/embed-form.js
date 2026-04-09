// js/embed-form.js
export function loadEmbedForm() {
    const containers = document.querySelectorAll('.embed-form');
    
    containers.forEach(container => {
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

// Auto load when any .embed-form div appears
document.addEventListener('DOMContentLoaded', loadEmbedForm);
