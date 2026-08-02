// ============================================================
// useLanguage.js — hook + context for the Tamil/bilingual toggle.
//
// Split from LanguageContext.jsx so that file exports only the
// provider component (required by react-refresh/only-export-components).
// Components import { useLanguage } from here; the provider wraps the app.
// ============================================================

import { createContext, useContext } from 'react';

export const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
  ready: false
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export default LanguageContext;
