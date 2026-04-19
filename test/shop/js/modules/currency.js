function renderCurrencySelector(target) {
  if (CONFIG.features?.showCurrencySelector === false) return;
  const container = typeof target === "string" ? document.querySelector(target) : target;
  if (!container || typeof Currency === "undefined") return;
  
  async function build() {
    // Wait for Currency to be ready before building selector
    if (Currency.waitForReady) await Currency.waitForReady();
    const active = Currency.getActive();
    container.className = "lumio-currency-selector";
    container.innerHTML = `
      <label class="lumio-currency-selector__label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14">
          <circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 0 0 20M12 2a15 15 0 0 1 0 20M2 12h20"/>
        </svg>
      </label>
      <select class="lumio-currency-selector__select" aria-label="Currency">
        ${Currency.list().map(c => `<option value="${c.code}"${c.code===active?" selected":""}>${c.code} ${c.symbol}</option>`).join("")}
      </select>`;
    container.querySelector("select").addEventListener("change", e => Currency.setActive(e.target.value));
  }
  
  build();
  document.addEventListener("currency:changed", build);
}
