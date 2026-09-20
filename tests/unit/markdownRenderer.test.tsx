import { describe, it, expect, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MarkdownRenderer } from '../../src/components/Common/MarkdownRenderer';
import { useCollapseStore } from '../../src/stores/collapseStore';

const render = (content: string, messageId = 'm1') =>
  renderToString(createElement(MarkdownRenderer, { content, messageId }));

/** 从渲染结果中提取行号列的行号序列 */
function extractLineNumbers(html: string): number[] {
  const match = /<pre class="code-line-numbers"[^>]*>([\s\S]*?)<\/pre>/.exec(html);
  if (!match || !match[1]) return [];
  return match[1].split('\n').map(Number);
}

describe('MarkdownRenderer 代码块', () => {
  beforeEach(() => {
    useCollapseStore.setState({ collapsedMessages: {}, codeBlockExpanded: {} });
  });

  it('渲染语言标识、行号与复制按钮', () => {
    const html = render('```js\nconst a = 1;\nconst b = 2;\n```');

    expect(html).toContain('code-language');
    expect(html).toContain('js');
    expect(html).toContain('copy-button');
    expect(extractLineNumbers(html)).toEqual([1, 2]);
  });

  it('行号与代码行一一对应（含空行）', () => {
    const code = 'a\n\nb\n\n\nc';
    const html = render(`\`\`\`python\n${code}\n\`\`\``);

    expect(extractLineNumbers(html)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('短代码块不显示收起条', () => {
    const html = render('```js\nconst a = 1;\n```');
    expect(html).not.toContain('code-toggle');
  });

  it('长代码块默认收起并显示展开全部按钮', () => {
    const code = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n');
    const html = render(`\`\`\`js\n${code}\n\`\`\``);

    expect(html).toContain('collapsed');
    expect(html).toContain('code-toggle');
    expect(html).toContain('展开全部');
    // 行号仍然完整渲染（1..20），裁剪只通过 CSS 高度实现
    expect(extractLineNumbers(html)).toHaveLength(20);
  });

  it('同一回复中多个代码块按顺序生成稳定标识', () => {
    const md = '```js\na\n```\n\n文本\n\n```js\nb\n```';
    const first = render(md);
    const second = render(md);
    // 相同内容渲染结果一致，展开状态可稳定对应到同一代码块
    expect(first).toBe(second);
  });

  it('行内代码不渲染为代码块', () => {
    const html = render('这是 `inline` 代码');
    expect(html).toContain('inline-code');
    expect(html).not.toContain('code-block');
  });
});

describe('MarkdownRenderer 表格与链接', () => {
  it('表格包裹在可横向滚动的容器中', () => {
    const md = '| A | B |\n| --- | --- |\n| 1 | 2 |';
    const html = render(md);

    expect(html).toContain('table-wrapper');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>');
  });

  it('链接保持新窗口打开与安全属性', () => {
    const html = render('[示例](https://example.com)');

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
