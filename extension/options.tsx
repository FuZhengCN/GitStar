import { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from './lib/i18n';
import './assets/tailwind.css';

function OptionsForm() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    chrome.storage.sync.get('githubToken').then(result => {
      if (result.githubToken) {
        setToken(result.githubToken);
        setStatus('success');
      }
    });
  }, []);

  async function handleSave() {
    if (!token.trim()) {
      setStatus('error');
      setMessage(t('tokenEmpty'));
      return;
    }

    setStatus('saving');
    setMessage('');

    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!res.ok) {
        setStatus('error');
        setMessage(t('tokenInvalid'));
        return;
      }

      await chrome.storage.sync.set({ githubToken: token.trim() });
      setStatus('success');
      setMessage(t('tokenSaved'));
    } catch {
      setStatus('error');
      setMessage(t('tokenNetworkError'));
    }
  }

  async function handleClear() {
    await chrome.storage.sync.remove('githubToken');
    setToken('');
    setStatus('idle');
    setMessage(t('tokenCleared'));
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-xl font-bold text-[#1e1b4b] mb-6">{t('configTitle')}</h1>

      {/* Language selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('languageLabel')}
        </label>
        <select
          value={lang}
          onChange={e => setLang(e.target.value as 'zh' | 'en')}
          className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
            GitHub Personal Access Token
          </label>
          <input
            id="token"
            type="password"
            value={token}
            onChange={e => { setToken(e.target.value); setStatus('idle'); setMessage(''); }}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            {t('createTokenAt')}{' '}
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3b82f6] hover:underline"
            >
              github.com/settings/tokens
            </a>{' '}
            {t('createTokenHint')}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className="px-4 py-2 bg-[#3b82f6] text-white text-sm rounded-lg hover:bg-[#2563eb] transition-colors disabled:opacity-50 min-w-[110px] text-center"
          >
            {status === 'saving' ? t('verifying') : t('save')}
          </button>
          {token && (
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-[#e5e7eb] text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('clear')}
            </button>
          )}
        </div>

        {message && (
          <div
            className={`text-sm p-3 rounded-lg ${
              status === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
              status === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
              'bg-gray-50 text-gray-600'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OptionsIndex() {
  return (
    <I18nProvider>
      <OptionsForm />
    </I18nProvider>
  );
}
