export function navigate(path) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);

    // Option 1: Use a custom event that your microfrontends can listen to
    window.dispatchEvent(new CustomEvent('navigation', { detail: { path } }));

    // Option 2: Still trigger popstate for backward compatibility
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}
