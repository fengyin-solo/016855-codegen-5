import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// 在模块加载前准备好 localStorage stub（store 加载时会读取）
const mock = vi.hoisted(() => {
  const data: Record<string, string> = {};
  const storage = {
    getItem: (key: string) => (key in data ? data[key] ?? null : null),
    setItem: (key: string, value: string) => {
      data[key] = String(value);
    },
    removeItem: (key: string) => {
      delete data[key];
    },
    clear: () => {
      for (const k of Object.keys(data)) delete data[k];
    },
  };
  (globalThis as Record<string, unknown>).localStorage = storage;
  return { data, storage };
});

const STORAGE_KEY = 'react-chat-block-views';

/** 生成带语言标识的代码块 markdown */
function codeMarkdown(lineCount: number, lang = 'js'): string {
  const body = Array.from({ length: lineCount }, (_, i) => `const line${i + 1} = ${i + 1};`).join('\n');
  return '```' + lang + '\n' + body + '\n```';
}

/** 生成表格 markdown（rows 为数据行数，另有 1 行表头） */
function tableMarkdown(dataRows: number): string {
  const header = '| 名称 | 值 |\n| --- | --- |';
  const body = Array.from({ length: dataRows }, (_, i) => `| 行${i + 1} | ${i + 1} |`).join('\n');
  return header + '\n' + body;
}

/**
 * 预置块视图状态后渲染回复
 * （SSR 下 zustand 读取的是 store 创建时的初始状态，因此每次重新加载模块）
 */
async function renderMessage(
  content: string,
  messageId: string,
  views: Record<string, string> = {},
  isStreaming = false,
): Promise<string> {
  mock.storage.clear();
  if (Object.keys(views).length > 0) {
    mock.data[STORAGE_KEY] = JSON.stringify(views);
  }
  vi.resetModules();
  const { MarkdownRenderer } = await import('@/components/Common/MarkdownRenderer');
  return renderToStaticMarkup(
    createElement(MarkdownRenderer, { content, messageId, isStreaming }),
  );
}

/** 提取行号槽并统计行号个数 */
function gutterLineCount(html: string): number {
  const match = /<div class="code-gutter"[^>]*>([\s\S]*?)<\/div>/.exec(html);
  if (!match || !match[1]) return 0;
  return (match[1].match(/<span>/g) ?? []).length;
}

beforeEach(() => {
  mock.storage.clear();
});

describe('代码块渲染', () => {
  it('短代码块：完整展开，带语言标识、行数与行号，无展开栏', async () => {
    const html = await renderMessage(codeMarkdown(5), 'm1');

    expect(html).toContain('code-block view-expanded');
    expect(html).not.toContain('is-long');
    expect(html).toContain('code-language');
    expect(html).toContain('>js</span>');
    expect(html).toContain('5 行');
    expect(html).toContain('copy-button');
    expect(html).not.toContain('code-expand-bar');
    // 行号数量与代码行数一一对应
    expect(gutterLineCount(html)).toBe(5);
  });

  it('长代码块：默认预览模式，显示展开栏', async () => {
    const html = await renderMessage(codeMarkdown(15), 'm1');

    expect(html).toContain('view-preview');
    expect(html).toContain('code-body is-preview');
    expect(html).toContain('code-expand-bar');
    expect(html).toContain('展开全部 15 行');
    expect(html).toContain('15 行');
    expect(gutterLineCount(html)).toBe(15);
  });

  it('中间空行也占一个行号，行数与内容对得上', async () => {
    const html = await renderMessage('```\n第一行\n\n第三行\n```', 'm1');
    expect(gutterLineCount(html)).toBe(3);
    expect(html).toContain('3 行');
  });

  it('历史状态为展开时：完整显示全部内容', async () => {
    const html = await renderMessage(codeMarkdown(15), 'm1', { 'm1:code:0': 'expanded' });

    expect(html).toContain('view-expanded');
    expect(html).not.toContain('is-preview');
    // 第 15 行完整渲染（高亮后文本被 span 拆分，断言行内容片段）
    expect(html).toContain('line15');
    expect(html).toContain('hljs-number">15<');
    // 展开栏变为“收起”
    expect(html).toContain('code-expand-bar');
    expect(html).toContain('>收起</span>');
  });

  it('历史状态为收起时：只留标题栏，且重复渲染保持一致', async () => {
    const views = { 'm1:code:0': 'collapsed' };

    const first = await renderMessage(codeMarkdown(15), 'm1', views);
    expect(first).toContain('view-collapsed');
    expect(first).not.toContain('code-body');
    expect(first).toContain('code-language');
    expect(first).toContain('15 行');

    // 再次回到这条回复，展示方式与上次相同
    const second = await renderMessage(codeMarkdown(15), 'm1', views);
    expect(second).toContain('view-collapsed');
    expect(second).not.toContain('code-body');
  });

  it('不同回复的相同代码块状态互不影响', async () => {
    const collapsed = await renderMessage(codeMarkdown(15), 'm1', { 'm1:code:0': 'collapsed' });
    const other = await renderMessage(codeMarkdown(15), 'm2', { 'm1:code:0': 'collapsed' });

    expect(collapsed).toContain('view-collapsed');
    expect(other).toContain('view-preview');
  });

  it('行内代码保持原有渲染', async () => {
    const html = await renderMessage('这是 `inline` 代码', 'm1');
    expect(html).toContain('class="inline-code"');
    expect(html).not.toContain('code-block');
  });

  it('单行的围栏代码块仍按块渲染（不误判为行内代码）', async () => {
    const html = await renderMessage('```\nx = 1\n```', 'm1');
    expect(html).toContain('code-block');
    expect(html).not.toContain('class="inline-code"');
    expect(gutterLineCount(html)).toBe(1);
  });

  it('流式输出期间长代码块保持展开，不裁切正在到达的内容', async () => {
    const html = await renderMessage(codeMarkdown(15), 'm1', {}, true);

    expect(html).toContain('view-expanded');
    expect(html).not.toContain('is-preview');
    expect(html).toContain('line15');
  });

  it('流式期间用户已收起的块保持收起', async () => {
    const html = await renderMessage(codeMarkdown(15), 'm1', { 'm1:code:0': 'collapsed' }, true);
    expect(html).toContain('view-collapsed');
    expect(html).not.toContain('code-body');
  });
});

describe('表格渲染', () => {
  it('短表格：仅横向滚动容器，无标题栏', async () => {
    const html = await renderMessage(tableMarkdown(3), 'm1');

    expect(html).toContain('table-wrapper');
    expect(html).toContain('<table>');
    expect(html).toContain('<thead>');
    expect(html).not.toContain('table-block');
    expect(html).not.toContain('table-header');
  });

  it('长表格：带标题栏（行 × 列），默认展开', async () => {
    const html = await renderMessage(tableMarkdown(13), 'm1');

    expect(html).toContain('table-block view-expanded');
    expect(html).toContain('table-header');
    expect(html).toContain('表格 · 14 行 × 2 列');
    expect(html).toContain('<table>');
  });

  it('历史状态为收起时：只留标题栏', async () => {
    const html = await renderMessage(tableMarkdown(13), 'm1', { 'm1:table:0': 'collapsed' });

    expect(html).toContain('table-block view-collapsed');
    expect(html).toContain('表格 · 14 行 × 2 列');
    expect(html).not.toContain('<table>');
  });
});

describe('既有功能保持不变', () => {
  it('链接新窗口打开', async () => {
    const html = await renderMessage('[示例](https://example.com)', 'm1');

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('markdown-link');
  });

  it('代码块头部保留复制按钮', async () => {
    const html = await renderMessage(codeMarkdown(3), 'm1');
    expect(html).toContain('copy-button');
  });
});
