const _loadedScripts = new Map();

export async function loadScript(src, attrs = {}) {
    return new Promise((resolve, reject) => {
        const baseSrc = src.split('?')[0];
        if (_loadedScripts.has(baseSrc)) return resolve(_loadedScripts.get(baseSrc));
        const existing = document.querySelector(`script[src*="${baseSrc.split('/').pop()}"]`);
        if (existing) {
            if (existing._loadPromise) return resolve(existing._loadPromise);
            if (existing._loadSuccess) return resolve();
            existing.remove();
        }
        const script = document.createElement('script');
        script.src = src;
        script.type = attrs.type || 'text/javascript';
        const loadPromise = new Promise((resolveLoad, rejectLoad) => {
            script.onload = () => {
                script._loadSuccess = true;
                _loadedScripts.set(baseSrc, Promise.resolve());
                resolveLoad();
            };
            script.onerror = () => {
                _loadedScripts.delete(baseSrc);
                rejectLoad(new Error(`Failed to load: ${src}`));
            };
        });
        script._loadPromise = loadPromise;
        Object.entries(attrs).forEach(([k, v]) => {
            if (k !== 'type') script.setAttribute(k, v);
        });
        document.head.appendChild(script);
        loadPromise.then(resolve).catch(reject);
    });
}

