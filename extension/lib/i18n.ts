import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import zh from '../locales/zh.json';
import en from '../locales/en.json';

type Lang = 'zh' | 'en';

const locales: Record<Lang, Record<string, string>> = { zh, en };
const STORAGE_KEY = 'gitstar-lang';

function normalizeLang(raw: string): Lang {
  if (raw.startsWith('zh')) return 'zh';
  return 'en';
}

interface I18nContextValue {
  t: (key: string) => string;
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => normalizeLang(navigator.language));

  // Async read stored preference
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY).then(result => {
      if (result[STORAGE_KEY] === 'zh' || result[STORAGE_KEY] === 'en') {
        setLangState(result[STORAGE_KEY]);
      }
    }).catch(() => {});
  }, []);

  // Cross-context sync via onChanged
  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      const v = changes[STORAGE_KEY]?.newValue;
      if (v === 'zh' || v === 'en') {
        setLangState(v);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    chrome.storage.local.set({ [STORAGE_KEY]: l }).catch(() => {});
  }, []);

  const t = useMemo(() => {
    return (key: string): string => {
      const locale = locales[lang];
      if (locale[key] !== undefined) return locale[key];
      const fallback = locales['zh'];
      if (fallback[key] !== undefined) return fallback[key];
      if (process.env.NODE_ENV === 'development') {
        console.warn(`i18n key missing: ${key}`);
      }
      return key;
    };
  }, [lang]);

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
