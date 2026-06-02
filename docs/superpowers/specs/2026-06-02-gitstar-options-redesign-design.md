# Options 页面 UI 重设计

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Options 页从线性堆叠表单重构为卡片分区布局，统一视觉风格，简化安全提示。

**Architecture:** 单页面 React 组件（`OptionsForm`），3 张功能域卡片 + 1 条统一安全提示 + 底部 footer。每张卡片独立保存/清除，状态消息内嵌在卡片底部。

**Tech Stack:** React 18 + TypeScript + Tailwind CSS 3，Chrome extension options page（Plasmo v0.90.5）

**Source:** `extension/options.tsx`（组件），`extension/locales/{zh,en}.json`（i18n）

---

## 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 布局模式 | 卡片分区 | 与 popup 设计语言一致（白底+阴影），信息层级清晰 |
| 卡片分组 | 通用 / GitHub / AI 概述 | 按功能域拆分，非 API 凭证合并 |
| 卡片顺序 | 通用 → GitHub → AI 概述 | 用户先配置基础体验，再连接外部服务 |
| 安全提示 | 统一一条 | 消除当前两条几乎相同警告的冗余 |
| 图标 | emoji + 蓝色胶囊 | 跨平台可接受，与 popup 已有 emoji 惯例一致 |
| 页面宽度 | max-w-lg (512px) | Chrome options 页有完整 tab 宽度，不用限制为 popup 的 400px |
| 状态消息 | 各卡片底部内嵌 | 明确归属，不跳动 |
| 保存按钮 | 每卡片独立 | 消除"保存"按钮保存哪个配置的歧义 |

## 页面结构

```
┌─ GitStar 配置 ───────────────────── (max-w-lg, 512px) ─┐
│                                                         │
│ ┌─ ⚙️ 通用设置 ──────────────────────────────────────┐ │
│ │  语言 / Language                    [中文 ▾]        │ │
│ │  ────────────────────────────────────────────────   │ │
│ │  GitHub 侧边栏推荐                      [🔘 ON]     │ │
│ │  在 GitHub 页面右侧显示热门项目推荐                  │ │
│ └────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ 🔗 GitHub ────────────────────────────────────────┐ │
│ │  Personal Access Token                              │ │
│ │  [ghp_••••••••••••••••••••]                        │ │
│ │  在 github.com/settings/tokens 创建，只需勾选        │ │
│ │  public_repo 权限                                    │ │
│ │  [保存] [清除]        ← Clear 仅数据存在时显示      │ │
│ │  ┌─────────────────────────────────────────────┐    │ │
│ │  │ ✓ Token 验证成功，已保存 (绿色, idle 时隐藏) │    │ │
│ │  └─────────────────────────────────────────────┘    │ │
│ └────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ 🤖 AI 概述 ──────────────────────────────────────┐ │
│ │  API 地址                                          │ │
│ │  [https://api.deepseek.com/v1/chat/completions]    │ │
│ │  API Key                                           │ │
│ │  [sk-••••••••••••••••••••]                         │ │
│ │  模型                    概述语言                   │ │
│ │  [deepseek-chat]         [中文 ▾]                  │ │
│ │  [保存] [清除]        ← Clear 仅数据存在时显示      │ │
│ │  ┌─────────────────────────────────────────────┐    │ │
│ │  │ ✓ 保存成功 (绿色, idle 时隐藏)               │    │ │
│ │  └─────────────────────────────────────────────┘    │ │
│ └────────────────────────────────────────────────────┘ │
│                                                         │
│ ⚠️ 安全提示：Token 和 API Key 均以明文存储在本地，    │
│ 请使用最小权限的凭证并定期撤销。                         │
│                                                         │
│ 隐私权政策 · 反馈 · v1.3.0                              │
└─────────────────────────────────────────────────────────┘
```

## 组件拆分

现有 `OptionsForm` 约 330 行，重设计后预计 ~350 行。不拆分子组件（配置页逻辑简单，拆分会增加不必要的 prop drilling）。

### OptionsForm（修改）

**State（不变）：**
- `token`, `status`, `message` — GitHub Token
- `sidebarEnabled` — Sidebar 开关
- `aiEndpoint`, `aiKey`, `aiModel`, `aiLang`, `aiStatus`, `aiMessage` — AI 配置

**Handlers（不变）：**
- `handleSave()` / `handleClear()` — GitHub Token
- `handleSaveAiConfig()` / `handleClearAiConfig()` — AI 配置
- `handleSidebarToggle()` — Sidebar 开关

**JSX 结构变更：**

```
旧结构（线性）：                      新结构（卡片）：
<div max-w-lg p-6>                   <div max-w-lg p-6>
  <h1>            ← 不变               <h1 GitStar 配置>   ← 去 emoji
  Language select ← 不变               ┌─ Card: 通用设置 ─┐
  ┌─ AI config ─┐ ← 改为卡片           │ Language selector │
  Sidebar toggle ← 移到通用卡片         │ ── divider ──    │
  GitHub Token   ← 改为卡片             │ Sidebar toggle   │
  Security notices ← 合并去重           └──────────────────┘
  Footer         ← 不变               ┌─ Card: GitHub ────┐
                                       │ Token input      │
                                       │ Create link      │
                                       │ [保存] [清除]    │
                                       │ Status message   │
                                       └──────────────────┘
                                       ┌─ Card: AI 概述 ──┐
                                       │ Endpoint input   │
                                       │ API Key input    │
                                       │ Model + Language │
                                       │ [保存] [清除]    │
                                       │ Status message   │
                                       └──────────────────┘
                                       Security notice (unified)
                                       Footer
```

## 卡片样式规范

所有卡片使用统一样式：
- `bg-white border border-[#e5e7eb] rounded-lg`（10px）
- `shadow-[0_1px_4px_rgba(0,0,0,0.04)]`
- `p-4`（16px）
- 卡片间距 `mb-3`（12px）

卡片标题行：
- `text-xs font-bold text-[#1e1b4b]`
- emoji 图标容器：`w-[22px] h-[22px] bg-[#eff6ff] rounded-md flex items-center justify-center text-xs`

表单通用样式（当前已使用，延续）：
- 标签：`text-xs font-medium text-[#1e1b4b]`（原 `text-gray-600` 改为项目色）
- 输入框：`w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm shadow-[0_1px_2px_rgba(0,0,0,0.03)]` + focus ring
- 主按钮：`px-4 py-2 bg-[#3b82f6] text-white text-sm rounded-lg hover:bg-[#2563eb]` + `disabled:opacity-50` + `min-w-[80px]`
- 次按钮（清除）：`px-4 py-2 border border-[#e5e7eb] text-sm rounded-lg hover:bg-gray-50 text-[#6b7280]`

分隔线（通用卡片内）：`border-t border-[#f3f4f6] my-3`

状态消息（成功/错误，在各卡片底部内嵌）：
- 成功：`bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a] text-xs p-2.5 rounded-lg mt-2.5`
- 错误：`bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-xs p-2.5 rounded-lg mt-2.5`

安全提示条：
- `bg-[#fffbeb] border border-[#fde68a] rounded-lg px-3 py-2.5 mb-3`
- `text-[10px] text-[#a16207]` + title `font-bold text-[#92400e]`

Footer：保持当前样式不变

## i18n 变更

新增 1 个 key（安全提示合并后用新 key，旧的 `tokenSecurityTitle`/`tokenSecurityDesc`/`aiSecurityTitle`/`aiSecurityDesc` 标记废弃但保留）：

| Key | zh | en |
|-----|----|----|
| `securityNotice` | ⚠️ 安全提示：Token 和 API Key 均以明文存储在本地，请使用最小权限的凭证并定期撤销。 | ⚠️ Security Notice: Tokens and API Keys are stored in plaintext locally. Use minimal-permission credentials and revoke unused ones regularly. |

## 无障碍

- Sidebar 开关：`<button role="switch" aria-checked={sidebarEnabled} onClick={handleSidebarToggle} onKeyDown={...}>` 支持 Enter/Space
- 所有输入框保持 `<label htmlFor="...">` 关联
- API Key 输入框 `type="password"` 保护

## 不做

- 不拆分子组件（单文件足够）
- 不引入新的依赖或图标库
- 不改变保存逻辑或 API 调用
- 不修改 `handleSave`/`handleClear`/`handleSaveAiConfig`/`handleClearAiConfig` 的业务逻辑
- 不改变 `chrome.storage` 的 key 名
