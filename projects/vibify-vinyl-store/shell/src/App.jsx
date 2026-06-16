import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { navigate } from './nav.js'; // <-- navigation helper

const TABS = [
  { key: 'catalog', label: 'Store' },
  { key: 'player', label: 'Player' },
  { key: 'checkout', label: 'Cart' },
];

export default function App() {
  // Initialise: hash overrides pathname (Catalog sets hash, shell sets pathname)
  const initialTab = (window.location.hash.replace(/^#\//, '') || window.location.pathname.replace(/^\//, '') || 'catalog');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [mfModules, setMfModules] = useState({});

  // Sync tab when URL changes (popstate for path, hashchange for hash)
  useEffect(() => {
    const syncTab = () => {
      const tab = (window.location.hash.replace(/^#\//, '') || window.location.pathname.replace(/^\//, '') || 'catalog');
      setActiveTab(tab);
    };
    window.addEventListener('popstate', syncTab);
    window.addEventListener('hashchange', syncTab);
    return () => {
      window.removeEventListener('popstate', syncTab);
      window.removeEventListener('hashchange', syncTab);
    };
  }, []);

  // Preload micro‑frontend bootstrap modules
  useEffect(() => {
    let cancelled = false;

    console.log('Starting to load MF modules...');

    Promise.all([
      import('mfCatalog/bootstrap'),
      import('mfPlayer/bootstrap'),
      import('mfCheckout/bootstrap'),
    ]).then(([catalog, player, checkout]) => {
      console.log('Raw modules loaded:', { catalog, player, checkout });
      console.log('Catalog module structure:', Object.keys(catalog));
      console.log('Catalog mount type:', typeof catalog?.mount);

      if (!cancelled) {
        const modules = {
          catalog: { mount: catalog?.default?.mount },
          player: { mount: player?.default?.mount },
          checkout: { mount: checkout?.default?.mount },
        };
        console.log('Setting modules:', modules);
        setMfModules(modules);
      }
    }).catch(err => {
      console.error('Failed to load MF modules:', err);
    });

    return () => { cancelled = true; };
  }, []);


  const mfKey = useRef(0);
  const handleTabChange = useCallback((key) => {
    setActiveTab(key);
    mfKey.current += 1; // force re‑mount of MF
    navigate(`/${key}`); // update URL without full reload
  }, []);

  return (
    <div className="shell">
      <nav className="shell-nav">
        <a href="/catalog" className="shell-logo">VIBIFY</a>
        <div className="shell-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`shell-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="shell-main">
        {activeTab === 'catalog' && (
          <MFLoader
            mountFn={mfModules.catalog?.mount}
            label="Catalog"
          />
        )}
        {activeTab === 'player' && (
          <MFLoader
            mountFn={mfModules.player?.mount}
            label="Player"
          />
        )}
        {activeTab === 'checkout' && (
          <MFLoader
            mountFn={mfModules.checkout?.mount}
            label="Checkout"
          />
        )}
      </main>
    </div>
  );
}

/** Generic microfrontend loader — calls mount()/unmount() on lifecycle. */
function MFLoader({ mountFn, label }) {
  const ref = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!ref.current || !mountFn) return;

    // Mount the microfrontend
    // Pass createRoot for micro-frontends that need it (e.g. checkout)
    const instance = mountFn(ref.current, { createRoot });
    instanceRef.current = instance;

    // Cleanup function
    return () => {
      const currentInstance = instanceRef.current;
      instanceRef.current = null;

      // Defer unmount to avoid React warning about synchronously
      // unmounting a root during passive effects cleanup.
      if (currentInstance?.unmount) {
        queueMicrotask(() => currentInstance.unmount());
      }
    };
  }, [mountFn]);

  if (!mountFn) {
    return (
      <div className="mf-loading">
        <p>Loading {label ?? 'microfrontend'}...</p>
      </div>
    );
  }

  return <div ref={ref} className="mf-container" />;
}
