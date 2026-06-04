import { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from './lib/i18n';
import pkg from './package.json';
import './assets/tailwind.css';

function OptionsForm() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    chrome.storage.local.get('githubToken').then(result => {
      if (result.githubToken) {
        setToken(result.githubToken);
        setStatus('success');
      }
    });
  }, []);

  // AI Summary config
  const [aiEndpoint, setAiEndpoint] = useState('https://api.deepseek.com/v1/chat/completions');
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState('deepseek-chat');
  const [aiLang, setAiLang] = useState('中文');
  const [aiStatus, setAiStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [aiMessage, setAiMessage] = useState('');

  // Load AI config on mount
  useEffect(() => {
    chrome.storage.local.get('gitstar-ai-config').then(result => {
      const cfg = result['gitstar-ai-config'];
      if (cfg) {
        if (cfg.endpoint) setAiEndpoint(cfg.endpoint);
        if (cfg.apiKey) setAiKey(cfg.apiKey);
        if (cfg.model) setAiModel(cfg.model);
        if (cfg.summaryLanguage) setAiLang(cfg.summaryLanguage);
      }
    }).catch(() => {});
  }, []);

  async function handleSaveAiConfig() {
    if (!aiKey.trim()) {
      setAiStatus('error');
      setAiMessage(t('tokenEmpty'));
      return;
    }
    setAiStatus('saving');
    try {
      await chrome.storage.local.set({
        'gitstar-ai-config': {
          endpoint: aiEndpoint.trim(),
          apiKey: aiKey.trim(),
          model: aiModel.trim(),
          summaryLanguage: aiLang,
        },
      });
      setAiStatus('success');
      setAiMessage(t('tokenSaved'));
    } catch {
      setAiStatus('error');
      setAiMessage(t('tokenNetworkError'));
    }
  }

  async function handleClearAiConfig() {
    await chrome.storage.local.remove('gitstar-ai-config');
    setAiKey('');
    setAiStatus('idle');
    setAiMessage('');
  }

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

      await chrome.storage.local.set({ githubToken: token.trim() });
      setStatus('success');
      setMessage(t('tokenSaved'));
    } catch {
      setStatus('error');
      setMessage(t('tokenNetworkError'));
    }
  }

  async function handleClear() {
    await chrome.storage.local.remove('githubToken');
    setToken('');
    setStatus('idle');
    setMessage(t('tokenCleared'));
  }

  return (
    <div className="max-w-lg mx-auto p-6 bg-slate-50 min-h-screen">
      <h1 className="text-xl font-bold text-[#1e1b4b] mb-5">GitStar 配置</h1>

      {/* Card 1: General */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-4 mb-3">
        <div className="text-xs font-bold text-[#1e1b4b] mb-3 flex items-center gap-1.5">
          <span className="w-[22px] h-[22px] bg-[#eff6ff] rounded-md flex items-center justify-center text-xs">⚙️</span>
          通用设置
        </div>
        <div className="mb-3">
          <label className="block text-xs font-medium text-[#1e1b4b] mb-1">{t('languageLabel')}</label>
          <select
            value={lang}
            onChange={e => setLang(e.target.value as 'zh' | 'en')}
            className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      {/* Card 2: GitHub */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-4 mb-3">
        <div className="text-xs font-bold text-[#1e1b4b] mb-3 flex items-center gap-1.5">
          <span className="w-[22px] h-[22px] bg-[#eff6ff] rounded-md flex items-center justify-center text-xs">🔗</span>
          GitHub
        </div>
        <div className="mb-3">
          <label htmlFor="token" className="block text-xs font-medium text-[#1e1b4b] mb-1">
            Personal Access Token
          </label>
          <input
            id="token"
            type="password"
            value={token}
            onChange={e => { setToken(e.target.value); setStatus('idle'); setMessage(''); }}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
          />
          <p className="text-[10px] text-[#6b7280] mt-1">
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
        <div className="flex gap-2 mb-2">
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className="px-4 py-2 bg-[#3b82f6] text-white text-sm rounded-lg hover:bg-[#2563eb] transition-colors disabled:opacity-50 min-w-[80px] text-center"
          >
            {status === 'saving' ? t('verifying') : t('save')}
          </button>
          {token && (
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-[#e5e7eb] text-sm rounded-lg hover:bg-gray-50 transition-colors text-[#6b7280]"
            >
              {t('clear')}
            </button>
          )}
        </div>
        {message && (
          <div
            className={`text-xs p-2.5 rounded-lg ${
              status === 'success' ? 'bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a]' :
              status === 'error' ? 'bg-[#fef2f2] border border-[#fecaca] text-[#dc2626]' :
              'bg-gray-50 text-gray-600'
            }`}
          >
            {message}
          </div>
        )}
      </div>

      {/* Card 3: AI Summary */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-4 mb-3">
        <div className="text-xs font-bold text-[#1e1b4b] mb-3 flex items-center gap-1.5">
          <span className="w-[22px] h-[22px] bg-[#eff6ff] rounded-md flex items-center justify-center text-xs">🤖</span>
          {t('aiOptionSectionTitle')}
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#1e1b4b] mb-1">{t('aiOptionEndpoint')}</label>
            <input
              type="url"
              value={aiEndpoint}
              onChange={e => setAiEndpoint(e.target.value)}
              className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1e1b4b] mb-1">{t('aiOptionApiKey')}</label>
            <input
              type="password"
              value={aiKey}
              onChange={e => { setAiKey(e.target.value); setAiStatus('idle'); setAiMessage(''); }}
              placeholder="sk-xxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#1e1b4b] mb-1">{t('aiOptionModel')}</label>
              <input
                type="text"
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                placeholder="deepseek-chat"
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#1e1b4b] mb-1">{t('aiOptionLanguage')}</label>
              <select
                value={aiLang}
                onChange={e => setAiLang(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
              >
                <option value="中文">中文</option>
                <option value="English">English</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveAiConfig}
              disabled={aiStatus === 'saving'}
              className="px-4 py-2 bg-[#3b82f6] text-white text-sm rounded-lg hover:bg-[#2563eb] transition-colors disabled:opacity-50 min-w-[80px] text-center"
            >
              {aiStatus === 'saving' ? t('verifying') : t('save')}
            </button>
            {aiKey && (
              <button
                onClick={handleClearAiConfig}
                className="px-4 py-2 border border-[#e5e7eb] text-sm rounded-lg hover:bg-gray-50 transition-colors text-[#6b7280]"
              >
                {t('clear')}
              </button>
            )}
          </div>
          {aiMessage && (
            <div
              className={`text-xs p-2.5 rounded-lg ${
                aiStatus === 'success' ? 'bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a]' :
                aiStatus === 'error' ? 'bg-[#fef2f2] border border-[#fecaca] text-[#dc2626]' :
                'bg-gray-50 text-gray-600'
              }`}
            >
              {aiMessage}
            </div>
          )}
        </div>
      </div>

      {/* Unified security notice */}
      <div className="bg-[#fffbeb] border border-[#fde68a] rounded-lg px-3 py-2.5 mb-3 text-[10px] text-[#a16207]">
        {t('securityNotice')}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-[#9ca3af] space-x-3">
        <a
          href="https://fuzhengcn.github.io/GitStar/store-listing/privacy-policy.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3b82f6] hover:underline"
        >
          {t('privacyPolicy')}
        </a>
        <a
          href="https://github.com/FuZhengCN/GitStar/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3b82f6] hover:underline"
        >
          {t('feedback')}
        </a>
        <span>v{pkg.version}</span>
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
