/* ─────────────────────────────────────────────────────────────────────────────
   main.css — Dornori
   ───────────────────────────────────────────────────────────────────────────── */

:root {
    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --font-mono: ui-monospace, "SF Mono", Menlo, monospace;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; height: 100%; }

body {
    background-color: var(--bg);
    color: var(--text);
    font-family: var(--font-sans);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    background-image:
        radial-gradient(circle at center, transparent 0%, var(--bg) 95%),
        linear-gradient(rgba(245, 242, 155, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(245, 242, 155, 0.03) 1px, transparent 1px);
    background-size: 100% 100%, 50px 50px, 50px 50px;
}

/* ── SETTINGS TAB ── */
#topBar-tab {
    position: absolute;
    bottom: -28px;
    right: 24px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 6px 6px;
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    box-shadow: 0 2px 0 0 var(--accent);
    transition: color 0.2s, background 0.2s;
}

/* Invisible bridge to prevent pointer gaps */
#topBar-tab::before {
    content: '';
    position: absolute;
    top: -10px;
    left: 0;
    right: 0;
    height: 10px;
}

#topBar-tab:hover { color: var(--accent); }

#topBar-tab svg {
    width: 12px;
    height: 12px;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

#topBar.active #topBar-tab svg { transform: rotate(45deg); }

/* ── HOVER-REVEAL TOP BAR ── */
#topBar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 44px;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 24px;
    gap: 16px;
    background: var(--header-bg, var(--bg));
    border-bottom: 1px solid var(--border);
    box-shadow: 0 2px 0 0 var(--accent);
    overflow: visible;
    transform: translateY(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

#topBar.active { transform: translateY(0); }

/* ── SELECTORS ── */
.profile-selector-wrap {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    color: var(--text-muted);
}

.profile-select {
    appearance: none;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 3px;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 4px 24px 4px 8px;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 6px center;
}

/* ── NAVIGATION & LAYOUT ── */
header {
    width: 100%;
    position: sticky;
    top: 0;
    z-index: 1000;
    background: var(--header-bg, var(--bg));
}

nav.top-nav {
    display: flex;
    justify-content: flex-end;
    padding: 12px 40px;
    gap: 25px;
}

.nav-link {
    text-decoration: none;
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 2px;
}

.nav-link:hover { color: var(--accent); }

main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
}

.hidden { display: none !important; }

@media (max-width: 768px) {
    nav.top-nav { display: none; }
    .mobile-nav {
        display: flex;
        position: fixed;
        left: 0;
        right: 0;
        z-index: 999;
        background: var(--header-bg, var(--bg));
        border-bottom: 1px solid var(--border);
    }
}
