import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import zh from '../locales/zh.json';
import en from '../locales/en.json';
import { AppError } from './types';

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
  const [ready, setReady] = useState(false);

  // Async read stored preference; gate children on readiness to prevent flash
  useEffect(() => {
    if (!chrome?.storage) {
      setReady(true);
      return;
    }
    chrome.storage.local.get(STORAGE_KEY).then(result => {
      if (result[STORAGE_KEY] === 'zh' || result[STORAGE_KEY] === 'en') {
        setLangState(result[STORAGE_KEY]);
      }
      setReady(true);
    }).catch(() => {
      setReady(true);
    });
  }, []);

  // Cross-context sync via onChanged
  useEffect(() => {
    if (!chrome?.storage) return;
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
    if (!chrome?.storage) return;
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

  if (!ready) return null;

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

export function errorMessageText(e: Error, t: (key: string) => string): string {
  if (e instanceof AppError) {
    const map: Record<string, string> = {
      RATE_LIMIT: 'rateLimitError',
      REPO_NOT_FOUND: 'repoNotFound',
      NETWORK_ERROR: 'tokenNetworkError',
      LOAD_FAILED: 'loadFailed',
    };
    return t(map[e.code] || 'loadFailed');
  }
  return e.message;
}
