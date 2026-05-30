import { describe, it, expect } from 'vitest';
import { marked } from 'marked';

/**
 * Test: Chinese markdown rendering with marked
 *
 * This tests the full pipeline to isolate the root cause of garbled text:
 * 1. Does marked.parse() correctly handle Chinese characters?
 * 2. Does it handle mixed ASCII + CJK in code blocks, tables, etc.?
 */

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

// Simulate how GitHub API encodes README content
function encodeBase64Utf8(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

describe('decodeBase64Utf8', () => {
  it('correctly decodes Chinese characters', () => {
    const original = '你好世界';
    const base64 = encodeBase64Utf8(original);
    const decoded = decodeBase64Utf8(base64);
    expect(decoded).toBe(original);
  });

  it('correctly decodes mixed content', () => {
    const original = '这是 README.md 文件，包含中文和 English 混合内容。';
    const base64 = encodeBase64Utf8(original);
    const decoded = decodeBase64Utf8(base64);
    expect(decoded).toBe(original);
  });

  it('correctly decodes emoji and special characters', () => {
    const original = '🚀 Hello 世界 — "test" • bullet → arrow';
    const base64 = encodeBase64Utf8(original);
    const decoded = decodeBase64Utf8(base64);
    expect(decoded).toBe(original);
  });

  it('atob alone garbles Chinese (proving the bug)', () => {
    const original = '你好世界';
    const base64 = encodeBase64Utf8(original);
    const garbled = atob(base64);
    // atob should NOT produce the original Chinese text
    expect(garbled).not.toBe(original);
    // 4 Chinese chars → 12 UTF-8 bytes → 12 Latin-1 garbled chars
    expect(garbled.length).toBe(12);
  });
});

describe('marked.parse with Chinese content', () => {
  it('renders Chinese headings correctly', () => {
    const input = '# 你好世界\n\n这是一段内容。';
    const html = marked.parse(input, { gfm: true }) as string;
    expect(html).toContain('你好世界');
    expect(html).toContain('这是一段内容');
  });

  it('renders Chinese code blocks correctly', () => {
    const input = '```javascript\n// 这是一个中文注释\nconst greeting = "你好";\n```';
    const html = marked.parse(input, { gfm: true }) as string;
    expect(html).toContain('中文注释');
    expect(html).toContain('你好');
  });

  it('renders Chinese tables correctly', () => {
    const input = '| 名称 | 描述 |\n|------|------|\n| 归藏 | 社交卡片生成器 |';
    const html = marked.parse(input, { gfm: true }) as string;
    expect(html).toContain('归藏');
    expect(html).toContain('社交卡片生成器');
  });

  it('renders Chinese inline code correctly', () => {
    const input = '使用 `npm install` 安装依赖。';
    const html = marked.parse(input, { gfm: true }) as string;
    expect(html).toContain('<code>npm install</code>');
    expect(html).toContain('安装依赖');
  });

  it('renders Chinese links correctly', () => {
    const input = '[点击这里](https://example.com) 查看更多信息。';
    const html = marked.parse(input, { gfm: true }) as string;
    expect(html).toContain('点击这里');
    expect(html).toContain('查看更多信息');
  });

  it('does not corrupt Unicode when using breaks:true', () => {
    const input = '第一行\n第二行\n第三行';
    const html = marked.parse(input, { gfm: true, breaks: true }) as string;
    expect(html).toContain('第一行');
    expect(html).toContain('第二行');
    expect(html).toContain('第三行');
  });

  it('handles real-world Chinese README snippet', () => {
    const input = `# 归藏 · Social Card Skill

一个基于 [归藏](https://guizang.ai) 的社交卡片生成技能。

## 功能特点

- 🎨 **多种模板**：支持多种社交卡片样式
- 🚀 **快速生成**：一键生成高质量的社交分享图
- 🌐 **API 支持**：提供 RESTful API 接口

## 快速开始

\`\`\`bash
npm install guizang-social-card-skill
\`\`\`

## 示例

| 模板 | 描述 | 预览 |
|------|------|------|
| 默认 | 经典样式 | ✅ |
| 简约 | 极简设计 | ✅ |

> 更多信息请访问[官方文档](https://docs.example.com)。`;

    const html = marked.parse(input, { gfm: true, breaks: true }) as string;

    // Check Chinese content preserved
    expect(html).toContain('归藏');
    expect(html).toContain('社交卡片生成技能');
    expect(html).toContain('功能特点');
    expect(html).toContain('多种模板');
    expect(html).toContain('快速生成');
    expect(html).toContain('一键生成高质量的社交分享图');
    expect(html).toContain('快速开始');
    expect(html).toContain('经典样式');
    expect(html).toContain('极简设计');

    // Check code block preserved
    expect(html).toContain('npm install guizang-social-card-skill');

    // Check HTML structure intact
    expect(html).toContain('<h1');
    expect(html).toContain('<h2');
    expect(html).toContain('<table');
    expect(html).toContain('<code');
    expect(html).toContain('<blockquote');
  });
});
