import type { PlasmoCSConfig } from 'plasmo';
import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { searchRepos, getRepoDetail, loadToken, setToken } from '../lib/github';
import { I18nProvider } from '../lib/i18n';
import { useFavorites } from '../hooks/useFavorites';
import type { Repo } from '../lib/types';
import GitStarIcon from '../components/GitStarIcon';

export const config: PlasmoCSConfig = {
  matches: ['https://github.com/*'],
  run_at: 'document_idle',
};

// Plasmo 自动渲染需要默认导出，提供空组件避免 Error #130
// 实际 UI 由 mountPanel() 手动挂载到侧边栏位置
export default function PlasmoOverride() {
  return null;
}

let reactRoot: ReturnType<typeof createRoot> | null = null;
let mountTimeout: ReturnType<typeof setTimeout> | null = null;
let mountObserver: MutationObserver | null = null;
let lastUrl = location.href;

const recsCache = new Map<string, { data: Repo[]; ts: number }>();
const RECS_CACHE_TTL = 60000;

function cleanup() {
  if (mountTimeout) { clearTimeout(mountTimeout); mountTimeout = null; }
  if (mountObserver) { mountObserver.disconnect(); mountObserver = null; }
  if (reactRoot) { reactRoot.unmount(); reactRoot = null; }
}

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
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.githubToken) {
        setToken(changes.githubToken.newValue || null);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    loadToken().then(() => loadRecommendations());
  }, []);

  async function loadRecommendations() {
    const path = window.location.pathname;
    const match = path.match(/^\/([^/]+)\/([^/]+)/);
    const key = match && !['search', 'explore', 'settings', 'notifications'].includes(match[1])
      ? `${match[1]}/${match[2]}`
      : '_global';
    const cached = recsCache.get(key);
    if (cached && Date.now() - cached.ts < RECS_CACHE_TTL) {
      setRepos(cached.data);
      return;
    }

    setLoading(true);
    try {
      let result: Repo[];

      if (match && match[1] && match[2] && key !== '_global') {
        const [, owner, repo] = match;
        const detail = await getRepoDetail(owner, repo);
        const topics = detail.topics as string[] | undefined;
        if (topics && topics.length > 0) {
          const q = topics.slice(0, 3).map((t) => `topic:${t}`).join(' ');
          const sr = await searchRepos({ q, sort: 'stars', per_page: 6 });
          result = sr.items.filter((r) => r.full_name !== `${owner}/${repo}`).slice(0, 5);
        } else if (detail.language) {
          const sr = await searchRepos({ q: detail.language, sort: 'stars', per_page: 6 });
          result = sr.items.filter((r) => r.full_name !== `${owner}/${repo}`).slice(0, 5);
        } else {
          const sr = await searchRepos({ sort: 'stars', per_page: 5 });
          result = sr.items;
        }
      } else {
        const sr = await searchRepos({ sort: 'stars', per_page: 5 });
        result = sr.items;
      }

      setRepos(result);
      recsCache.set(key, { data: result, ts: Date.now() });
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
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: '#3b82f6',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => setCollapsed(false)}
      >
        <GitStarIcon size={28} style={{ display: 'block' }} />
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
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <GitStarIcon size={14} />
            GitStar · 同类热门
          </span>
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
                            ? '#f59e0b'
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
        </div>
      </div>
    </div>
  );
}

// 手动 DOM 挂载到 GitHub 侧边栏位置
function mountPanel() {
  cleanup();

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
        reactRoot = createRoot(root);
        reactRoot.render(<I18nProvider><SidebarPanel /></I18nProvider>);
        return true;
      }
    }
    return false;
  }

  if (tryMount()) return;

  mountObserver = new MutationObserver(() => {
    if (tryMount()) { mountObserver?.disconnect(); mountObserver = null; }
  });
  mountObserver.observe(document.body, { childList: true, subtree: true });

  // 10 秒超时 → 浮动面板回退
  mountTimeout = setTimeout(() => {
    mountObserver?.disconnect();
    mountObserver = null;
    mountTimeout = null;
    if (!document.getElementById('gitstar-root')) {
      const float = document.createElement('div');
      float.id = 'gitstar-root';
      float.style.cssText =
        'position:fixed;right:16px;top:80px;z-index:9999;width:220px;';
      document.body.appendChild(float);
      reactRoot = createRoot(float);
      reactRoot.render(<I18nProvider><SidebarPanel /></I18nProvider>);
    }
  }, 10000);
}

mountPanel();

// 监听 URL 变化（GitHub SPA 导航），自动清理并重新挂载
// 页面隐藏时跳过检查，减少后台轮询开销
setInterval(() => {
  if (document.hidden) return;
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    mountPanel();
  }
}, 500);
