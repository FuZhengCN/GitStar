import { useState, useEffect } from 'react';
import './assets/tailwind.css';

export default function OptionsIndex() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

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
      setMessage('Token 不能为空');
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
        setMessage('Token 无效，请检查后重试');
        return;
      }

      await chrome.storage.sync.set({ githubToken: token.trim() });
      setStatus('success');
      setMessage('Token 验证成功，已保存');
    } catch {
      setStatus('error');
      setMessage('网络错误，请检查网络连接');
    }
  }

  async function handleClear() {
    await chrome.storage.sync.remove('githubToken');
    setToken('');
    setStatus('idle');
    setMessage('Token 已清除');
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-xl font-bold text-[#1e1b4b] mb-6">GitStar 配置</h1>

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
            className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            在{' '}
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4f46e5] hover:underline"
            >
              github.com/settings/tokens
            </a>{' '}
            创建，只需勾选 <code className="bg-gray-100 px-1 rounded">public_repo</code> 权限
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className="px-4 py-2 bg-[#6366f1] text-white text-sm rounded-lg hover:bg-[#4f46e5] transition-colors disabled:opacity-50"
          >
            {status === 'saving' ? '验证中...' : '保存'}
          </button>
          {token && (
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-[#e5e7eb] text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              清除
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
