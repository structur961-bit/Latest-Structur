import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('structur_lang') || 'en');

  const setLang = (l) => {
    setLangState(l);
    localStorage.setItem('structur_lang', l);
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, []);

  const t = (key, fallback) => {
    const keys = key.split('.');
    // Try current language first
    let val = translations[lang];
    for (const k of keys) val = val?.[k];
    if (val) return val;
    // Fall back to English (never show raw key)
    let enVal = translations['en'];
    for (const k of keys) enVal = enVal?.[k];
    return enVal || fallback || key;
  };

  const isRTL = lang === 'ar';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}