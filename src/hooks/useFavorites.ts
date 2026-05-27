'use client';
import { useState, useEffect, useCallback } from 'react';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('gitstar-favorites');
      if (stored) setFavorites(JSON.parse(stored));
    } catch { /* corrupted data, start fresh */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem('gitstar-favorites', JSON.stringify(favorites));
    }
  }, [favorites, loaded]);

  const toggle = useCallback((fullName: string) => {
    setFavorites(prev =>
      prev.includes(fullName) ? prev.filter(f => f !== fullName) : [...prev, fullName]
    );
  }, []);

  const isFavorite = useCallback((fullName: string) => favorites.includes(fullName), [favorites]);

  return { favorites, toggle, isFavorite, loaded };
}
