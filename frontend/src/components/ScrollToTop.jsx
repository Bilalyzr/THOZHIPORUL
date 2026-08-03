import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop — scrolls the window to the top whenever the route path
 * changes. Place it once inside <BrowserRouter>. Without this, navigating
 * between pages keeps the previous scroll position, so a user who clicks a
 * deep page lands partway down instead of at the top.
 *
 * Preserves in-page hash anchors (e.g. /page#section scrolls to the element).
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If the URL has a #hash, let the browser jump to that anchor instead.
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname, hash]);

  return null;
}
