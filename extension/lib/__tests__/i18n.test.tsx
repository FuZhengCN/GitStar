import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { I18nProvider, useI18n } from '../i18n';

function LanguageDisplay() {
  try {
    const { lang } = useI18n();
    return <span data-testid="lang">{lang}</span>;
  } catch {
    return <span data-testid="no-provider">no provider</span>;
  }
}

function mockChromeStorage() {
  let resolveGet: (value: Record<string, string>) => void = () => {};
  const getPromise = new Promise<Record<string, string>>((resolve) => {
    resolveGet = resolve;
  });

  (globalThis as Record<string, unknown>).chrome = {
    storage: {
      local: {
        get: vi.fn().mockReturnValue(getPromise),
        set: vi.fn().mockResolvedValue(undefined),
      },
      sync: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  };

  return {
    resolveGet: (lang: string) => resolveGet({ 'gitstar-lang': lang }),
  };
}

describe('I18nProvider', () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).chrome;
  });

  it('does NOT render children until stored language is read, preventing flash', async () => {
    const { resolveGet } = mockChromeStorage();

    render(
      <I18nProvider>
        <LanguageDisplay />
      </I18nProvider>
    );

    // Before storage resolves, children must NOT render (prevents navigator.language flash)
    expect(screen.queryByTestId('lang')).toBeNull();

    // Resolve storage with stored language 'zh'
    await act(async () => {
      resolveGet('zh');
    });

    // After storage resolves, children render with the stored language
    const langEl = await screen.findByTestId('lang');
    expect(langEl).toHaveTextContent('zh');
  });

  it('renders immediately with navigator.language when chrome.storage is unavailable', async () => {
    // chrome declared but storage undefined — simulates non-extension environment
    (globalThis as Record<string, unknown>).chrome = {};

    render(
      <I18nProvider>
        <LanguageDisplay />
      </I18nProvider>
    );

    // Renders with navigator.language (en in jsdom) after effect flushes
    const langEl = await screen.findByTestId('lang');
    expect(langEl).toHaveTextContent('en');
  });
});
