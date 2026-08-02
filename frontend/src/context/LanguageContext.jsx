// ============================================================
// LanguageContext.jsx — Tamil/bilingual UI toggle (Quick Win 6).
//
// Exports ONLY the LanguageProvider component (so React Fast Refresh
// stays happy). The context object + useLanguage hook live in the
// sibling file useLanguage.js — import the hook from there.
//
// Purely additive: components that don't call useLanguage() are 100%
// unaffected. Existing pages keep rendering English until they opt in.
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { LanguageContext } from './useLanguage';

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'en');
  const [dict, setDict] = useState({});
  const [ready, setReady] = useState(false);

  // Fetch dictionary whenever the language changes. Failure (e.g. v3
  // migration not applied on the backend) just leaves us with an empty
  // dictionary — UI still works in English.
  useEffect(() => {
    let cancelled = false;
    // Flip the "loading" flag via the fetch completion (not synchronously
    // inside the effect body) to avoid cascading renders.
    api.get(`/i18n/dictionary?lang=${lang}`)
      .then((res) => {
        if (cancelled) return;
        setDict(res.data || {});
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setDict({});
        setReady(true);
      });
    return () => { cancelled = true; };
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangState(next);
    localStorage.setItem('lang', next);
  }, []);

  const t = useCallback(
    (key) => dict[key] || key,
    [dict]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, ready }}>
      {children}
    </LanguageContext.Provider>
  );
}

export default LanguageProvider;
