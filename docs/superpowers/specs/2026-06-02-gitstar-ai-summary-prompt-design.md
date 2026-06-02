# AI 概要 Prompt 优化 — 设计文档

**日期：** 2026-06-02
**范围：** `extension/lib/ai-summary.ts` 中的 SYSTEM_PROMPTS

## 问题诊断

| # | 问题 | 根因 |
|---|------|------|
| 1 | 功能描述偏泛，与 GitHub Description 区分度不高 | Prompt 只要求"1-2 句话描述主要功能"，无技术导向约束 |
| 2 | 场景描述不够开发者视角 | Prompt 用"适用场景"措辞，LLM 倾向输出宽泛的通用用户场景 |
| 3 | 缺少质量约束 | Prompt 没有禁止空泛措辞、禁止复读简介等 guardrail |

## 方案

方案 A：只改 system prompt，不动其他代码。在现有的 功能/场景 两维度框架内，通过更精准的 prompt 引导 LLM 输出技术化、有信息密度的内容。

## 设计

### System Prompt 重写

**中文版：**

```
你是一个面向开发者的技术文档概述助手。用简洁、技术化的中文总结以下README文档。严格按以下格式输出（不要输出其他内容）：

功能：<1-2句话，用技术术语描述项目的核心功能。必须包含关键技术栈或架构关键词（如框架、语言、协议、设计模式）。避免空泛描述（如"一个强大的工具"），避免重复项目简介。>
场景：<1-2句话，面向开发者描述具体的使用场景和典型上下文。说明什么情况下应选择此项目、它解决了什么技术痛点。>
```

**英文版：**

```
You are a developer-oriented technical documentation summarizer. Summarize the following README in concise, technical English. Output strictly in this format (no other content):

Function: <1-2 sentences describing core functionality using technical terminology. MUST include key tech stack or architecture keywords (e.g., framework, language, protocol, design pattern). Avoid vague descriptions (e.g., "a powerful tool"). Do not rephrase the project tagline.>
Use cases: <1-2 sentences describing concrete use cases and typical application contexts from a developer's perspective. Explain when a developer should choose this project and what technical pain point it solves.>
```

### 关键变更点

| 变更 | 原 Prompt | 新 Prompt |
|------|----------|----------|
| 定位 | "技术文档概述助手" | "面向开发者的技术文档概述助手" |
| 功能维度 | "描述项目的主要功能" | "用技术术语描述核心功能，必须包含关键技术栈或架构关键词" |
| 质量约束 | 无 | 禁止空泛描述（如"一个强大的工具"），禁止重复项目简介 |
| 场景维度 | "描述适用场景" | "面向开发者描述具体的使用场景，说明什么情况下应选择此项目、解决了什么技术痛点" |

### 不改动的部分

- UI：面板尺寸、颜色、布局、浮动按钮行为均不变
- 解析：仍按 `功能：/场景：/Function:/Use cases:` 前缀拆分卡片
- 缓存：key 前缀 `gitstar-ai:summary:v1:` 不变，旧缓存继续有效（新生成的覆盖旧的）
- API 调用：`temperature`(0.3)、`max_tokens`(500)、`README_TRUNCATE_BYTES`(8192) 均不变
- 预处理：`truncateReadme()` 的图片/代码块剥离逻辑不变

## 涉及文件

| 文件 | 变更 |
|------|------|
| `extension/lib/ai-summary.ts` | 替换 `SYSTEM_PROMPTS` 中的两段 prompt 文案 |

## 验证方式

1. `cd extension && npm run build`
2. 在 Chrome `chrome://extensions/` 加载 `build/chrome-mv3-prod/`
3. 打开 popup → 进入任意详情页 → 展开 README → 点击 🤖 触发 AI 概要
4. 检查输出：功能描述是否包含技术栈关键词、场景描述是否为开发者视角、是否比原版更有信息量
5. 切换语言验证英文 prompt 输出

## Non-Goals

- 不改变输出维度（保持 功能/场景 两个维度）
- 不改变预处理逻辑（truncateReadme）
- 不改变 UI 交互
- 不改变缓存机制
