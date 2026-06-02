# AI 概要 Prompt 优化 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化 AI 概要的 system prompt，使输出更技术化、信息密度更高

**Architecture:** 纯文案变更，仅替换 `extension/lib/ai-summary.ts` 中 `SYSTEM_PROMPTS` 的两个 prompt 字符串，不影响 API 调用参数、缓存键、UI 解析

**Tech Stack:** TypeScript，无新增依赖

---

### Task 1: 替换 SYSTEM_PROMPTS + 验证现有测试

**Files:**
- Modify: `extension/lib/ai-summary.ts`

- [ ] **Step 1: 替换 SYSTEM_PROMPTS 中的中文 prompt**

找到 `extension/lib/ai-summary.ts` 第 56-63 行，将 `SYSTEM_PROMPTS` 对象替换为：

```ts
const SYSTEM_PROMPTS: Record<string, string> = {
  '中文': `你是一个面向开发者的技术文档概述助手。用简洁、技术化的中文总结以下README文档。严格按以下格式输出（不要输出其他内容）：

功能：<1-2句话，用技术术语描述项目的核心功能。必须包含关键技术栈或架构关键词（如框架、语言、协议、设计模式）。避免空泛描述（如"一个强大的工具"），避免重复项目简介。>
场景：<1-2句话，面向开发者描述具体的使用场景和典型上下文。说明什么情况下应选择此项目、它解决了什么技术痛点。>`,
  'English': `You are a developer-oriented technical documentation summarizer. Summarize the following README in concise, technical English. Output strictly in this format (no other content):

Function: <1-2 sentences describing core functionality using technical terminology. MUST include key tech stack or architecture keywords (e.g., framework, language, protocol, design pattern). Avoid vague descriptions (e.g., "a powerful tool"). Do not rephrase the project tagline.>
Use cases: <1-2 sentences describing concrete use cases and typical application contexts from a developer's perspective. Explain when a developer should choose this project and what technical pain point it solves.>`,
};
```

- [ ] **Step 2: 运行现有测试确保 prompt 格式兼容**

```bash
cd extension && npx vitest run
```

预期：全部通过。`ai-summary.test.tsx` 中的测试应继续通过，因为 `fetchSummary` 的接口签名和返回格式没有变化。

- [ ] **Step 3: 构建验证**

```bash
cd extension && npm run build
```

预期：构建成功，无 TypeScript 编译错误。

- [ ] **Step 4: 提交**

```bash
git add extension/lib/ai-summary.ts
git commit -m "feat: AI 概要 prompt 优化 — 技术导向 + 质量约束"
```

---

## 验证清单

- [ ] 现有测试全部通过（`npx vitest run`）
- [ ] 生产构建成功（`npm run build`）
- [ ] 中英文 prompt 输出格式保持 `功能：/场景：/Function:/Use cases:` 前缀，解析逻辑不受影响
