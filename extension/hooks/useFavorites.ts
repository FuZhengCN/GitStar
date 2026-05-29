import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'gitstar-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!chrome?.storage) {
      setFavorites([]);
      setLoaded(true);
      return;
    }
    chrome.storage.local.get(STORAGE_KEY).then(result => {
      setFavorites(result[STORAGE_KEY] || []);
      setLoaded(true);
    }).catch(() => {
      setFavorites([]);
      setLoaded(true);
    });

    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes[STORAGE_KEY]) {
        setFavorites(changes[STORAGE_KEY].newValue || []);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    if (!chrome?.storage) return;
    if (loaded && favorites !== null) {
      chrome.storage.local.set({ [STORAGE_KEY]: favorites });
    }
  }, [favorites, loaded]);

  const toggle = useCallback(async (fullName: string) => {
    setFavorites(prev =>
      (prev || []).includes(fullName)
        ? (prev || []).filter(f => f !== fullName)
        : [...(prev || []), fullName]
    );
  }, []);

  const isFavorite = useCallback(
    (fullName: string) => (favorites || []).includes(fullName),
    [favorites]
  );

  return { favorites, toggle, isFavorite, loaded };
}
