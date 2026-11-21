// Navigation (Hash-Router)
export function go(path, { replace = false } = {}) {
  const target = '#' + path;
  if (replace || location.hash === target) {
    history.replaceState(null, '', target);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = path;
  }
}
