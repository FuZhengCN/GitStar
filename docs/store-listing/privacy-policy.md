# Privacy Policy for GitStar

*Last updated: 2026-05-29*

## English

### Data Collection

**GitStar does not collect, transmit, or share any personal information.** The extension operates entirely on your device with no external servers, no analytics, and no third-party services.

### Data Stored Locally

All data is stored on your device using Chrome's built-in storage APIs:

| Data | Storage Location | Purpose |
|------|-----------------|---------|
| GitHub Personal Access Token | `chrome.storage.sync` | Authenticate GitHub API requests. Synced across your Chrome browsers if Chrome Sync is enabled. |
| Favorite projects list | `chrome.storage.local` | Your locally bookmarked repositories. Never leaves your device. |
| API response cache | `chrome.storage.local` | Improve loading speed by caching search results and repository info. Automatically expires. |
| Language preference | `chrome.storage.local` | Remember your UI language choice (Chinese / English). |
| Sidebar toggle preference | `chrome.storage.local` | Remember whether the sidebar recommendation panel is enabled. |
| Sidebar collapse state | `localStorage` | Remember whether the sidebar panel is collapsed on GitHub pages. |

### Network Requests

The extension makes network requests **only** to `https://api.github.com` — the official GitHub REST API — for the following purposes:

- Searching repositories
- Fetching repository details and README content
- Starring / unstarring repositories (only with user-provided token)
- Validating the GitHub token in the options page

**No data is sent to any server other than api.github.com.**

### Data Sharing

GitStar does not share any data with any third party. There is no backend server, no analytics service, and no advertising network integrated into this extension.

### User Control

- You can view and delete all stored data via Chrome's extension management page (`chrome://extensions` → GitStar → "Inspect views").
- You can clear your GitHub token at any time from the options page.
- You can remove individual favorites from the favorites page.
- All cached data is automatically evicted on a least-recently-used basis (max 30 cache entries).

### Children's Privacy

This extension is not directed at children under the age of 13 and does not knowingly collect any personal information from children.

### Contact

For questions about this privacy policy, please open an issue at the project's repository.

---

## 中文

### 数据收集

**GitStar 不收集、不传输、不共享任何个人信息。** 此扩展完全在你的设备上运行，无外部服务器、无统计分析、无第三方服务。

### 本地存储的数据

所有数据均通过 Chrome 内置存储 API 保存在你的设备上：

| 数据 | 存储位置 | 用途 |
|------|---------|------|
| GitHub Personal Access Token | `chrome.storage.sync` | 用于 GitHub API 认证。如果你启用了 Chrome 同步，Token 会跨设备同步。 |
| 收藏项目列表 | `chrome.storage.local` | 你本地收藏的仓库。绝不离开你的设备。 |
| API 响应缓存 | `chrome.storage.local` | 缓存搜索结果和仓库信息以提升加载速度。自动过期淘汰。 |
| 语言偏好 | `chrome.storage.local` | 记住你的界面语言选择（中文 / 英文）。 |
| 侧边栏开关偏好 | `chrome.storage.local` | 记住侧边栏推荐面板是否启用。 |
| 侧边栏折叠状态 | `localStorage` | 记住 GitHub 页面上侧边栏面板是否已折叠。 |

### 网络请求

此扩展**仅**向 `https://api.github.com`（GitHub 官方 REST API）发起网络请求，用于以下目的：

- 搜索仓库
- 获取仓库详情和 README 内容
- Star / Unstar 仓库（仅在使用者提供的 Token 下）
- 在选项页验证 Token 有效性

**除 api.github.com 外，不会有任何数据发送到其他服务器。**

### 数据共享

GitStar 不与任何第三方共享数据。此扩展未集成任何后端服务器、分析服务或广告网络。

### 用户控制

- 你可以通过 Chrome 扩展管理页面（`chrome://extensions` → GitStar → "检查视图"）查看和删除所有存储数据。
- 你可以随时在选项页清除 GitHub Token。
- 你可以在收藏页逐个移除收藏的项目。
- 所有缓存数据按最近最少使用原则自动淘汰（最多 30 条缓存记录）。

### 儿童隐私

此扩展不面向 13 岁以下儿童，不会故意收集任何儿童的个人信息。

### 联系方式

如有关于本隐私政策的疑问，请在项目仓库中提交 Issue。
