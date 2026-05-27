import type { PlasmoCSConfig } from 'plasmo';
import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { searchRepos, getRepoDetail, loadToken, setToken } from '../lib/github';
import { useFavorites } from '../hooks/useFavorites';
import type { Repo } from '../lib/types';

export const config: PlasmoCSConfig = {
  matches: ['https://github.com/*'],
  run_at: 'document_idle',
};

// 监听 Token 变更
chrome.storage.onChanged.addListener((changes) => {
  if (changes.githubToken) {
    setToken(changes.githubToken.newValue || null);
  }
});

function SidebarPanel() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('gitstar-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const { favorites, toggle: toggleFavorite, loaded: favLoaded } = useFavorites();

  useEffect(() => {
    loadToken().then(() => loadRecommendations());
  }, []);

  async function loadRecommendations() {
    setLoading(true);
    try {
      const path = window.location.pathname;
      const match = path.match(/^\/([^/]+)\/([^/]+)/);
      if (
        match &&
        match[1] &&
        match[2] &&
        !['search', 'explore', 'settings', 'notifications'].includes(match[1])
      ) {
        const [, owner, repo] = match;
        const detail = await getRepoDetail(owner, repo);
        const lang = detail.language;
        if (lang) {
          const result = await searchRepos({ q: lang, sort: 'stars', per_page: 6 });
          setRepos(
            result.items.filter((r) => r.full_name !== `${owner}/${repo}`).slice(0, 5)
          );
        } else {
          const result = await searchRepos({ sort: 'stars', per_page: 5 });
          setRepos(result.items);
        }
      } else {
        const result = await searchRepos({ sort: 'stars', per_page: 5 });
        setRepos(result.items);
      }
    } catch {
      // 静默失败，不影响 GitHub 页面
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    localStorage.setItem('gitstar-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      setFloatPos({
        x: dragRef.current.posX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.posY + (e.clientY - dragRef.current.startY),
      });
    }
    function onUp() { dragRef.current = null; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  function onTitleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-action]')) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = floatPos ?? { x: rect.left, y: rect.top };
    dragRef.current = { startX: e.clientX, startY: e.clientY, posX: pos.x, posY: pos.y };
    if (!floatPos) setFloatPos(pos);
  }

  // 检测 GitHub 深色模式
  const colorMode = document.documentElement.getAttribute('data-color-mode');
  const isDark = colorMode === 'dark';
  const bgColor = isDark ? '#161b22' : '#f9fafb';
  const borderColor = isDark ? '#30363d' : '#e5e7eb';
  const textColor = isDark ? '#c9d1d9' : '#1e1b4b';
  const cardBg = isDark ? '#0d1117' : 'white';
  const mutedColor = isDark ? '#8b949e' : '#666';

  if (collapsed) {
    return (
      <div
        style={{
          position: 'fixed',
          right: '16px',
          top: '80px',
          zIndex: 9999,
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '8px 12px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontSize: '12px',
          color: textColor,
        }}
        onClick={() => setCollapsed(false)}
      >
        ⭐ GitStar
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '12px',
      }}
    >
      <div
        ref={panelRef}
        style={{
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '16px',
          maxHeight: 'calc(100vh - 100px)',
          display: 'flex',
          flexDirection: 'column',
          width: '220px',
          ...(floatPos
            ? { position: 'fixed', left: floatPos.x, top: floatPos.y, zIndex: 10000, marginBottom: 0 }
            : {}),
        }}
      >
        <div
          style={{
            background: '#3b82f6',
            color: 'white',
            padding: '6px 10px',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
            cursor: floatPos ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
          onMouseDown={onTitleMouseDown}
        >
          <span>⭐ GitStar · 同类热门</span>
          <span
            data-action="collapse"
            onClick={() => setCollapsed(true)}
            style={{ cursor: 'pointer', opacity: 0.7, fontSize: '14px' }}
          >
            −
          </span>
        </div>
        <div style={{ padding: '8px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: mutedColor, padding: '12px' }}>
              加载中...
            </div>
          ) : repos.length === 0 ? (
            <div style={{ textAlign: 'center', color: mutedColor, padding: '12px' }}>
              暂无推荐
            </div>
          ) : (
            repos.map((repo) => (
              <div
                key={repo.id}
                style={{
                  padding: '6px 8px',
                  background: cardBg,
                  borderRadius: '4px',
                  border: `1px solid ${isDark ? '#21262d' : '#f0f0f0'}`,
                  marginBottom: '6px',
                }}
              >
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ fontWeight: 600, fontSize: '11px', color: textColor }}>
                    {repo.full_name}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: mutedColor,
                      margin: '2px 0',
                    }}
                  >
                    {repo.description || '暂无描述'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#f59e0b' }}>
                    ★ {repo.stargazers_count.toLocaleString()}
                    {favLoaded && (
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite(repo.full_name);
                        }}
                        style={{
                          marginLeft: '8px',
                          cursor: 'pointer',
                          color: (favorites || []).includes(repo.full_name)
                            ? '#6366f1'
                            : isDark
                              ? '#484f58'
                              : '#e5e7eb',
                        }}
                      >
                        {(favorites || []).includes(repo.full_name) ? '★' : '☆'}
                      </span>
                    )}
                  </div>
                </a>
              </div>
            ))
          )}
          <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '10px' }}>
            <span
              onClick={() => {
                try {
                  chrome.action.openPopup();
                } catch {
                  /* fallback */
                }
              }}
              style={{ color: '#3b82f6', cursor: 'pointer' }}
            >
              在 Popup 中打开 →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 手动 DOM 挂载（不 export default 组件，避免 Plasmo 自动挂载）
function mountPanel() {
  const selectors = [
    '#repo-details-container',
    '.Layout-sidebar',
    'aside[aria-label="Repository details"]',
  ];

  function tryMount(): boolean {
    for (const sel of selectors) {
      const target = document.querySelector(sel);
      if (target) {
        const existing = document.getElementById('gitstar-root');
        if (existing) return true;
        const root = document.createElement('div');
        root.id = 'gitstar-root';
        target.insertBefore(root, target.firstChild);
        createRoot(root).render(<SidebarPanel />);
        return true;
      }
    }
    return false;
  }

  if (tryMount()) return;

  const observer = new MutationObserver(() => {
    if (tryMount()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 10 秒超时 → 浮动面板回退
  setTimeout(() => {
    observer.disconnect();
    if (!document.getElementById('gitstar-root')) {
      const float = document.createElement('div');
      float.id = 'gitstar-root';
      float.style.cssText =
        'position:fixed;right:16px;top:80px;z-index:9999;width:220px;';
      document.body.appendChild(float);
      createRoot(float).render(<SidebarPanel />);
    }
  }, 10000);
}

mountPanel();
