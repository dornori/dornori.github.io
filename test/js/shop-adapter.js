/**
 * shop-adapter.js  (v2)
 * ─────────────────────────────────────────────────────────────────────────────
 * Patches shop navigation when embedded inside the Dornori SPA:
 *   • "cart.html" links → window.viewPage('cart')
 *   • "index.html" / back-to-shop links → window.viewPage('shop')
 *   • Payment success → inline order-confirmed screen
 *
 * This script is a plain (non-module) <script> loaded by shop-loader.js.
 * It is harmless when shop pages are accessed directly (no #page-content-inner).
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
    'use strict';

    var isEmbedded = !!document.getElementById('page-content-inner');
    if (!isEmbedded) return;

    // ── Global click interceptor for all shop anchor links ────────────────────
    document.addEventListener('click', function (e) {
        var a = e.target.closest('a[href]');
        if (!a) return;

        var href = a.getAttribute('href') || '';

        // Normalise — strip query/hash for matching
        var clean = href.split('?')[0].split('#')[0].replace(/^.*\//, '');

        if (clean === 'cart.html') {
            e.preventDefault();
            if (typeof window.viewPage === 'function') window.viewPage('cart');
            return;
        }

        if (clean === 'index.html' || href === '#' || href === '') {
            // Only intercept if it's inside the embedded shop
            var inner = document.getElementById('page-content-inner');
            if (inner && inner.contains(a)) {
                e.preventDefault();
                if (typeof window.viewPage === 'function') window.viewPage('shop');
            }
            return;
        }
    }, true); // capture phase so we beat any inline onclick

    // ── Patch any existing btn-back-shop buttons already in DOM ──────────────
    function patchBackButtons(root) {
        (root || document).querySelectorAll('#btn-back-shop, .lumio-btn--back-shop').forEach(function (btn) {
            if (btn.dataset.spaPatch) return;
            btn.dataset.spaPatch = '1';
            btn.removeAttribute('onclick');
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof window.viewPage === 'function') window.viewPage('shop');
                else if (typeof window.showHome === 'function') window.showHome();
            });
        });
    }

    // Run on lumio:ready (cart HTML just injected) and on mutations
    document.addEventListener('lumio:ready', function () {
        setTimeout(function () {
            patchBackButtons(document.getElementById('page-content-inner'));
        }, 150);
    });

    // MutationObserver so dynamically-added cards are also patched
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            m.addedNodes.forEach(function (node) {
                if (node.nodeType === 1) patchBackButtons(node);
            });
        });
    });
    var inner = document.getElementById('page-content-inner');
    if (inner) observer.observe(inner, { childList: true, subtree: true });

    // Initial pass
    patchBackButtons();

    // ── Payment success: show inline confirmation ─────────────────────────────
    var _paymentSuccessHandled = false;
    document.addEventListener('payment:success', function () {
        if (_paymentSuccessHandled) return;
        _paymentSuccessHandled = true;

        setTimeout(function () {
            var ref   = localStorage.getItem('lumio_last_order') || '';
            var inner = document.getElementById('page-content-inner');
            if (!inner || typeof window.viewPage !== 'function') return;

            inner.innerHTML =
                '<div style="text-align:center;padding:80px 24px;max-width:520px;margin:0 auto;">' +
                  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" ' +
                       'style="width:56px;height:56px;margin-bottom:24px;">' +
                    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>' +
                    '<polyline points="22 4 12 14.01 9 11.01"/>' +
                  '</svg>' +
                  '<h2 style="font-family:var(--font-mono);letter-spacing:.08em;margin-bottom:16px;">ORDER CONFIRMED</h2>' +
                  '<p style="color:var(--text-muted);line-height:1.7;margin-bottom:8px;">' +
                    'Thank you for your purchase.<br>A confirmation email will be sent shortly.' +
                  '</p>' +
                  (ref
                    ? '<p style="font-family:var(--font-mono);font-size:.75rem;color:var(--text-muted);' +
                      'border:1px solid var(--border);display:inline-block;padding:6px 14px;margin-top:8px;' +
                      'border-radius:3px;">REF: ' + ref + '</p>'
                    : '') +
                  '<br><br>' +
                  '<button onclick="window.viewPage(\'shop\')" ' +
                    'style="font-family:var(--font-mono);padding:10px 28px;border:1px solid var(--border);' +
                    'background:transparent;color:var(--text);cursor:pointer;letter-spacing:.08em;' +
                    'font-size:.78rem;transition:border-color .15s,color .15s;"' +
                    ' onmouseover="this.style.borderColor=\'var(--accent)\';this.style.color=\'var(--accent)\'"' +
                    ' onmouseout="this.style.borderColor=\'var(--border)\';this.style.color=\'var(--text)\'">' +
                    'CONTINUE SHOPPING' +
                  '</button>' +
                '</div>';

            // Reset flag for next order
            _paymentSuccessHandled = false;
        }, 80);
    });

})();
